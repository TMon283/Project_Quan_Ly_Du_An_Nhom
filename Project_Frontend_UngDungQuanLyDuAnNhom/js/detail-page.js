const StorageService = {
    getData(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    },

    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    generateId(items) {
        return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    },

    updateProjectTasks(projectId, task) {
        const projects = this.getData('projects');
        const project = projects.find(p => p.id === projectId);
        if (project) {
            if (!project.tasks) project.tasks = [];
            project.tasks.push(task);
            this.saveData('projects', projects);
        }
    },

    updateUserProjects(userId, projectId) {
        const users = this.getData('users');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex].projects = users[userIndex].projects || [];
            if (!users[userIndex].projects.includes(projectId)) {
                users[userIndex].projects.push(projectId);
                this.saveData('users', users);
                return true;
            }
        }
        return false;
    }
};

const ValidationRules = {
    isEmpty(value) {
        return !value || value.trim() === '';
    },

    isValidLength(value, min, max) {
        return value.length >= min && value.length <= max;
    },

    isDuplicateTaskName(taskName, currentTaskId = null) {
        const tasks = StorageService.getData('tasks');
        return tasks.some(task => 
            task.taskName.toLowerCase() === taskName.toLowerCase() && 
            task.id !== currentTaskId
        );
    },

    isValidStartDate(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(date) >= today;
    },

    isValidDateRange(startDate, endDate) {
        return new Date(endDate) >= new Date(startDate);
    },

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

const TaskFilterService = {
    sortTasks(tasks, criteria) {
        return [...tasks].sort((a, b) => {
            switch (criteria) {
                case 'deadline':
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'priority':
                    const priorityOrder = { 'Cao': 1, 'Trung bình': 2, 'Thấp': 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                default:
                    return 0;
            }
        });
    },

    searchTasks(tasks, searchTerm) {
        if (!searchTerm) return tasks;
        searchTerm = searchTerm.toLowerCase();
        return tasks.filter(task => 
            task.taskName.toLowerCase().includes(searchTerm) ||
            this.getUserName(task.assigneeId).toLowerCase().includes(searchTerm)
        );
    },

    filterTasksByStatus(tasks) {
        return {
            'To do': tasks.filter(task => task.status === 'To do'),
            'In Progress': tasks.filter(task => task.status === 'In Progress'),
            'Pending': tasks.filter(task => task.status === 'Pending'),
            'Done': tasks.filter(task => task.status === 'Done')
        };
    },

    getUserName(userId) {
        const users = StorageService.getData('users') || [];
        const user = users.find(u => u.id === parseInt(userId));
        return user && user.name ? user.name : 'Chưa phân công';
    }
};

function renderMemberList() {
    const members = MemberService.getProjectMembers(); 
    const memberAvatars = document.querySelector('.member-avatars');
    if (!memberAvatars) {
        console.error("Không tìm thấy container thành viên");
        return;
    }
    
    memberAvatars.innerHTML = '';
    
    const maxVisible = 2;
    const visibleMembers = members.slice(0, maxVisible);
    
    visibleMembers.forEach(member => {
        if (!member || !member.name) {
            return;
        } 
        
        const avatar = document.createElement('div');
        avatar.className = 'member-avatar';
        avatar.innerHTML = `
            ${getInitials(member.name)}
            <div class="member-name-tooltip">
                ${member.name}<br>
                <small>${member.projectRole || member.role || 'Thành viên'}</small>
            </div>
        `;
        memberAvatars.appendChild(avatar);
    });

    if (members.length > maxVisible) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'show-more-members';
        showMoreBtn.textContent = `+${members.length - maxVisible}`;
        showMoreBtn.onclick = openMemberListModal;
        memberAvatars.appendChild(showMoreBtn);
    }
}

const MemberService = {
    getProjectMembers() {
        const selectedProjectId = parseInt(localStorage.getItem("selectedProjectId"));
        const projects = StorageService.getData("projects") || [];
        const project = projects.find(p => p.id === selectedProjectId);
            
        if (!project || !project.members) return [];
            
        const users = StorageService.getData("users") || [];
            
        return project.members
            .filter(member => member && member.userId) // Lọc thành viên hợp lệ
            .map(member => {
                const user = users.find(u => u.id === member.userId);
                if (!user) return null;
                return { 
                    ...user, 
                    role: member.role || 'Thành viên',
                    projectRole: member.role // Giữ lại vai trò trong dự án
                };
            })
            .filter(member => member !== null);
    },

    addMember(memberData) {
        const selectedProjectId = parseInt(localStorage.getItem("selectedProjectId"));
        const projects = StorageService.getData("projects");
        const projectIndex = projects.findIndex(p => p.id === selectedProjectId);
        
        if (projectIndex === -1) return { success: false, message: "Không tìm thấy dự án" };
    
        const users = StorageService.getData("users") || [];
        let user = users.find(u => u.email === memberData.email);
    
        // Nếu người dùng chưa tồn tại, tạo mới
        if (!user) {
            user = {
                id: StorageService.generateId(users),
                name: memberData.name || memberData.email.split('@')[0],
                email: memberData.email,
                projects: [selectedProjectId],
                role: 'Thành viên' // Vai trò mặc định
            };
            users.push(user);
            StorageService.saveData("users", users);
        } else {
            // Cập nhật dự án của người dùng nếu chưa có
            if (!user.projects || !user.projects.includes(selectedProjectId)) {
                user.projects = user.projects || [];
                user.projects.push(selectedProjectId);
                StorageService.saveData("users", users);
            }
        }
    
        // Khởi tạo mảng thành viên nếu chưa có
        projects[projectIndex].members = projects[projectIndex].members || [];
        
        // Kiểm tra thành viên đã tồn tại chưa
        const memberExists = projects[projectIndex].members.some(m => m.userId === user.id);
        
        if (!memberExists) {
            projects[projectIndex].members.push({
                userId: user.id,
                role: memberData.role || 'Thành viên'
            });
            
            StorageService.saveData("projects", projects);
            return { success: true, message: "Thêm thành viên thành công" };
        }
    
        return { success: false, message: "Thành viên đã tồn tại trong dự án" };
    },

    updateMemberRole(memberId, newRole) {
        const users = StorageService.getData("users");
        const userIndex = users.findIndex(u => u.id === memberId);
        
        if (userIndex !== -1) {
            users[userIndex].role = newRole;
            StorageService.saveData("users", users);
            return true;
        }
        return false;
    },

    deleteMember(memberId) {
        const users = StorageService.getData("users");
        const projects = StorageService.getData("projects");
        const selectedProjectId = parseInt(localStorage.getItem("selectedProjectId"));
        
        const projectIndex = projects.findIndex(p => p.id === selectedProjectId);
        if (projectIndex !== -1) {
            // Lọc bỏ member nhưng giữ lại Project owner
            projects[projectIndex].members = projects[projectIndex].members.filter(m => 
                m.userId !== memberId || m.role === "Project owner"
            );
            StorageService.saveData("projects", projects);
            
            // Render lại danh sách
            renderMemberList();
            closeMemberListModal();
            showSuccess("Xóa thành viên thành công");
        }
    }
};

const TaskService = {
    addTask(taskData) {
        const tasks = StorageService.getData('tasks') || [];
        const newTask = {
            ...taskData,
            id: StorageService.generateId(tasks),
            projectId: parseInt(localStorage.getItem('selectedProjectId')),
            createdDate: new Date().toISOString(),
            status: taskData.status || 'To do'
        };
        tasks.push(newTask);
        StorageService.saveData('tasks', tasks);

        // Cập nhật task vào project
        const projects = StorageService.getData('projects');
        const projectIndex = projects.findIndex(p => p.id === newTask.projectId);
        if (projectIndex !== -1) {
            if (!projects[projectIndex].tasks) {
                projects[projectIndex].tasks = [];
            }
            projects[projectIndex].tasks.push(newTask.id);
            StorageService.saveData('projects', projects);
        }

        return true;
    },

    updateTask(taskId, taskData) {
        const tasks = StorageService.getData('tasks');
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) return false;

        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...taskData
        };
        StorageService.saveData('tasks', tasks);
        return true;
    },

    deleteTask(taskId) {
        const tasks = StorageService.getData('tasks');
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        StorageService.saveData('tasks', filteredTasks);
    }
};

function showErrors(errors) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = errors.map(error => `<p class="error-message">${error}</p>`).join('');
    
    const modalBody = document.querySelector('.modal-body');
    const existingErrors = modalBody.querySelector('.error-container');
    if (existingErrors) {
        modalBody.removeChild(existingErrors);
    }
    modalBody.insertBefore(errorContainer, modalBody.firstChild);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        document.body.removeChild(successDiv);
    }, 3000);
}

// Hàm xử lý task
function addTask() {
    const taskData = {
        taskName: document.getElementById('task-name').value,
        assigneeId: document.getElementById('assignee').value,
        projectId: localStorage.getItem('selectedProjectId'),
        asignDate: document.getElementById('start-date').value,
        dueDate: document.getElementById('due-date').value,
        priority: document.getElementById('priority').value,
        progress: document.getElementById('progress').value,
        status: document.getElementById('status').value
    };

    const errors = [];

    if (ValidationRules.isEmpty(taskData.taskName)) {
        errors.push("Tên nhiệm vụ không được để trống");
    } else if (!ValidationRules.isValidLength(taskData.taskName, 5, 100)) {
        errors.push("Tên nhiệm vụ phải từ 5 đến 100 ký tự");
    }

    if (ValidationRules.isDuplicateTaskName(taskData.taskName)) {
        errors.push("Tên nhiệm vụ đã tồn tại");
    }

    if (ValidationRules.isEmpty(taskData.assigneeId)) {
        errors.push("Vui lòng chọn người phụ trách");
    }

    if (ValidationRules.isEmpty(taskData.asignDate)) {
        errors.push("Vui lòng chọn ngày bắt đầu");
    }

    if (ValidationRules.isEmpty(taskData.dueDate)) {
        errors.push("Vui lòng chọn hạn chót");
    }

    if (!ValidationRules.isValidStartDate(taskData.asignDate)) {
        errors.push("Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại");
    }

    if (!ValidationRules.isValidDateRange(taskData.asignDate, taskData.dueDate)) {
        errors.push("Hạn chót phải lớn hơn ngày bắt đầu");
    }

    if (ValidationRules.isEmpty(taskData.priority)) {
        errors.push("Vui lòng chọn độ ưu tiên");
    }

    if (ValidationRules.isEmpty(taskData.progress)) {
        errors.push("Vui lòng chọn tiến độ");
    }

    if (errors.length > 0) {
        showErrors(errors);
        return;
    }

    if (TaskService.addTask(taskData)) {
        closeModal();
        renderTaskList();
        showSuccess("Thêm nhiệm vụ thành công");
        
        // Reset form
        document.getElementById('task-name').value = '';
        document.getElementById('assignee').value = '';
        document.getElementById('start-date').value = '';
        document.getElementById('due-date').value = '';
        document.getElementById('priority').value = '';
        document.getElementById('progress').value = '';
        document.getElementById('status').value = 'To do';
    }
}

function renderTaskList() {
    const selectedProjectId = localStorage.getItem("selectedProjectId");
    let tasks = StorageService.getData("tasks") || [];
    
    tasks = tasks.filter(task => task.projectId == selectedProjectId);

    const searchTerm = document.querySelector('.content-right-bottom input').value;
    tasks = TaskFilterService.searchTasks(tasks, searchTerm);

    const sortCriteria = document.getElementById('filter').value;
    if (sortCriteria !== '0') {
        tasks = TaskFilterService.sortTasks(tasks, sortCriteria);
    }

    const groupedTasks = TaskFilterService.filterTasksByStatus(tasks);
    const taskListElement = document.querySelector(".task-list tbody");
    taskListElement.innerHTML = '';

    Object.entries(groupedTasks).forEach(([status, statusTasks]) => {
        const statusHeader = document.createElement('tr');
        statusHeader.className = `show-list ${status.toLowerCase().replace(' ', '-')}`;
        const isExpanded = localStorage.getItem(`expanded_${status}`) !== 'false';
        
        statusHeader.innerHTML = `
            <td colspan="7">
                <i class="fa-solid fa-caret-${isExpanded ? 'down' : 'right'}"></i> 
                ${status} (${statusTasks.length})
            </td>
        `;

        taskListElement.appendChild(statusHeader);

        if (statusTasks.length > 0 && isExpanded) {
            statusTasks.forEach(task => {
                const taskRow = document.createElement('tr');
                taskRow.className = 'task-row';
                taskRow.innerHTML = `
                    <td>${task.taskName}</td>
                    <td>${TaskFilterService.getUserName(task.assigneeId)}</td>
                    <td><span class="priority ${task.priority.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')}">${task.priority}</span></td>
                    <td class="time">${formatDate(task.asignDate)}</td>
                    <td class="time">${formatDate(task.dueDate)}</td>
                    <td><div class="process ${getProgressClass(task.progress)}">${task.progress}</div></td>
                    <td>
                        <button class="edit-btn" onclick="openEditModal(${task.id})">Sửa</button>
                        <button class="delete-btn" onclick="openDeleteModal(${task.id})">Xóa</button>
                    </td>
                `;
                taskListElement.appendChild(taskRow);
            });
        }
    });

    addStatusHeaderListeners();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Checking localStorage data:');
    console.log('currentUser:', localStorage.getItem('currentUser'));
    console.log('selectedProjectId:', localStorage.getItem('selectedProjectId'));
    console.log('projects:', StorageService.getData('projects'));
    console.log('users:', StorageService.getData('users'));

    const selectedProjectId = parseInt(localStorage.getItem("selectedProjectId"));
    const projects = StorageService.getData("projects");
    const project = projects.find(p => p.id === selectedProjectId);
    
    if (project && project.members) {
        // Lọc bỏ thành viên undefined
        project.members = project.members.filter(m => m && m.userId);
        StorageService.saveData("projects", projects);
    }

    // Khởi tạo dữ liệu mẫu nếu cần
    initializeSampleData();
    
    // Kiểm tra quyền truy cập
    checkProjectAccess();
    
    // Cập nhật giao diện
    fillProjectInformation();
    fillAssigneeSelect();
    renderTaskList();
    renderMemberList();
});

document.querySelector('.content-right-bottom input').addEventListener('input', debounce(() => {
    renderTaskList();
}, 300));

document.getElementById('filter').addEventListener('change', () => {
    renderTaskList();
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getProgressClass(progress) {
    const progressMap = {
        'Đúng tiến độ': 'on-schedule',
        'Có rủi ro': 'risk',
        'Trễ hạn': 'late'
    };
    return progressMap[progress] || 'on-schedule';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modal handlers
function openModal() {
    const taskModal = document.getElementById('task-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (taskModal && modalOverlay) {
        taskModal.style.display = 'block';
        modalOverlay.style.display = 'block';
        
        // Reset form
        document.getElementById('task-name').value = '';
        document.getElementById('assignee').value = '';
        document.getElementById('status').value = 'To do';
        document.getElementById('start-date').value = '';
        document.getElementById('due-date').value = '';
        document.getElementById('priority').value = '';
        document.getElementById('progress').value = '';
        
        // Xóa thông báo lỗi nếu có
        const errorContainer = taskModal.querySelector('.error-container');
        if (errorContainer) {
            errorContainer.remove();
        }
    } else {
        console.error('Không tìm thấy modal hoặc overlay');
    }
}

function closeModal() {
    const taskModal = document.getElementById('task-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (taskModal && modalOverlay) {
        taskModal.style.display = 'none';
        modalOverlay.style.display = 'none';
        
        // Xóa thông báo lỗi nếu có
        const errorContainer = taskModal.querySelector('.error-container');
        if (errorContainer) {
            errorContainer.remove();
        }
    }
}

function openDeleteModal(taskId) {
    document.getElementById('delete-modal').dataset.taskId = taskId;
    document.getElementById('delete-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

function openEditModal(taskId) {
    const tasks = StorageService.getData('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        // Cập nhật các giá trị vào form
        document.getElementById('edit-task-name').value = task.taskName;
        document.getElementById('edit-assignee').value = task.assigneeId || '';
        document.getElementById('edit-status').value = task.status;
        document.getElementById('edit-start-date').value = task.asignDate;
        document.getElementById('edit-due-date').value = task.dueDate;
        document.getElementById('edit-priority').value = task.priority;
        document.getElementById('edit-progress').value = task.progress;
        
        // Cập nhật danh sách người phụ trách trong modal sửa
        fillAssigneeSelect('edit-assignee');
        
        // Hiển thị modal và overlay
        document.getElementById('edit-modal').style.display = 'block';
        document.getElementById('modal-overlay').style.display = 'block';
        
        // Lưu taskId vào dataset của modal
        document.getElementById('edit-modal').dataset.taskId = taskId;

        // Xóa thông báo lỗi nếu có
        const errorContainer = document.querySelector('.error-container');
        if (errorContainer) {
            errorContainer.remove();
        }
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
    
    // Xóa thông báo lỗi nếu có
    const errorContainer = document.querySelector('#edit-modal .error-container');
    if (errorContainer) {
        errorContainer.remove();
    }
}

// Thêm hàm xử lý sửa và xóa task
function confirmEdit() {
    const taskId = parseInt(document.getElementById('edit-modal').dataset.taskId);
    const taskData = {
        taskName: document.getElementById('edit-task-name').value,
        assigneeId: document.getElementById('edit-assignee').value,
        status: document.getElementById('edit-status').value,
        asignDate: document.getElementById('edit-start-date').value,
        dueDate: document.getElementById('edit-due-date').value,
        priority: document.getElementById('edit-priority').value,
        progress: document.getElementById('edit-progress').value,
        projectId: localStorage.getItem('selectedProjectId')
    };

    // Thêm validation
    const errors = [];
    if (ValidationRules.isEmpty(taskData.taskName)) {
        errors.push("Tên nhiệm vụ không được để trống");
    } else if (!ValidationRules.isValidLength(taskData.taskName, 5, 100)) {
        errors.push("Tên nhiệm vụ phải từ 5 đến 100 ký tự");
    }

    if (ValidationRules.isEmpty(taskData.assigneeId)) {
        errors.push("Vui lòng chọn người phụ trách");
    }

    if (ValidationRules.isEmpty(taskData.asignDate)) {
        errors.push("Vui lòng chọn ngày bắt đầu");
    }

    if (ValidationRules.isEmpty(taskData.dueDate)) {
        errors.push("Vui lòng chọn hạn chót");
    }

    if (!ValidationRules.isValidDateRange(taskData.asignDate, taskData.dueDate)) {
        errors.push("Hạn chót phải lớn hơn ngày bắt đầu");
    }

    if (ValidationRules.isEmpty(taskData.priority)) {
        errors.push("Vui lòng chọn độ ưu tiên");
    }

    if (ValidationRules.isEmpty(taskData.progress)) {
        errors.push("Vui lòng chọn tiến độ");
    }

    if (errors.length > 0) {
        const modalBody = document.querySelector('#edit-modal .modal-body');
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        errorContainer.innerHTML = errors.map(error => `<p class="error-message">${error}</p>`).join('');
        
        const existingErrors = modalBody.querySelector('.error-container');
        if (existingErrors) {
            modalBody.removeChild(existingErrors);
        }
        modalBody.insertBefore(errorContainer, modalBody.firstChild);
        return;
    }

    if (TaskService.updateTask(taskId, taskData)) {
        closeEditModal();
        renderTaskList();
        showSuccess("Cập nhật nhiệm vụ thành công");
    }
}

function confirmDelete() {
    const taskId = parseInt(document.getElementById('delete-modal').dataset.taskId);
    if (taskId) {
        TaskService.deleteTask(taskId);
        closeDeleteModal();
        renderTaskList();
        showSuccess("Xóa nhiệm vụ thành công");
    }
}

function addStatusHeaderListeners() {
    document.querySelectorAll('.show-list').forEach(header => {
        header.addEventListener('click', function() {
            const status = this.classList[1];
            const isExpanded = this.querySelector('i').classList.contains('fa-caret-down');
            
            // Toggle icon
            this.querySelector('i').classList.replace(
                isExpanded ? 'fa-caret-down' : 'fa-caret-right',
                isExpanded ? 'fa-caret-right' : 'fa-caret-down'
            );

            let nextElement = this.nextElementSibling;
            while (nextElement && !nextElement.classList.contains('show-list')) {
                nextElement.style.display = isExpanded ? 'none' : 'table-row';
                nextElement = nextElement.nextElementSibling;
            }

            localStorage.setItem(`expanded_${status}`, !isExpanded);
        });
    });
}

function saveTaskToLocalStorage(taskData) {
    if (TaskService.addTask(taskData)) {
        showSuccess("Thêm nhiệm vụ thành công");
        return true;
    }
    return false;
}

function fillAssigneeSelect(selectId = 'assignee') {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Không tìm thấy phần tử select với ID ${selectId}`);
        return;
    }

    // Lấy ID dự án hiện tại
    const projectId = parseInt(localStorage.getItem("selectedProjectId"));
    if (!projectId) {
        console.error("Không tìm thấy ID dự án");
        return;
    }

    // Lấy dữ liệu từ localStorage
    const projects = StorageService.getData("projects") || [];
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
        console.error("Không tìm thấy dự án");
        select.innerHTML = '<option value="">Không có thành viên nào</option>';
        return;
    }

    project.members = project.members || [];
    const users = StorageService.getData("users") || [];
    select.innerHTML = '<option value="">Chọn người phụ trách</option>';
    project.members.forEach(member => {
        if (!member || !member.userId) {
            return;
        }
        
        const user = users.find(u => u.id === member.userId);
        if (user) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name; 
            select.appendChild(option);
        } else {
            console.warn("Không tìm thấy người dùng cho thành viên:", member);
        }
    });

    if (select.options.length === 1) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'Không có thành viên nào';
        select.appendChild(option);
    }
}

function initializeSampleData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        console.error("Không tìm thấy người dùng hiện tại");
        return;
    }

    // Khởi tạo dự án nếu chưa có
    if (!localStorage.getItem('projects')) {
        const sampleProjects = [
            {
                id: 1,
                projectName: "Xây dựng website thương mại điện tử",
                projectDescription: "Dự án nhằm phát triển một nền tảng thương mại điện tử hoàn chỉnh...",
                status: "Đang thực hiện",
                createdDate: new Date().toISOString().split('T')[0],
                endDate: "2024-05-20",
                creatorId: currentUser.id,
                members: [
                    {
                        userId: currentUser.id,
                        role: "Project owner"
                    }
                ],
                tasks: []
            }
        ];
        StorageService.saveData('projects', sampleProjects);
    }

    // Khởi tạo người dùng nếu chưa có
    if (!localStorage.getItem('users')) {
        const sampleUsers = [
            {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                role: "Project owner",
                projects: [1] 
            }
        ];
        StorageService.saveData('users', sampleUsers);
    }

    // Khởi tạo nhiệm vụ nếu chưa có
    if (!localStorage.getItem('tasks')) {
        const sampleTasks = [
            {
                id: 1,
                taskName: "Soạn thảo đề cương dự án",
                assigneeId: currentUser.id,
                projectId: 1,
                status: "To do",
                asignDate: "2024-02-24",
                dueDate: "2024-02-27",
                priority: "Trung bình",
                progress: "Có rủi ro",
                createdDate: new Date().toISOString()
            }
        ];
        StorageService.saveData('tasks', sampleTasks);
        
        // Thêm nhiệm vụ vào dự án
        const projects = StorageService.getData('projects');
        const project = projects.find(p => p.id === 1);
        if (project) {
            project.tasks = project.tasks || [];
            project.tasks.push(1);
            StorageService.saveData('projects', projects);
        }
    }

    if (!localStorage.getItem('selectedProjectId')) {
        localStorage.setItem('selectedProjectId', '1');
    }
}

function fillProjectInformation() {
    const selectedProjectId = parseInt(localStorage.getItem("selectedProjectId"));
    if (!selectedProjectId) {
        console.error("Không tìm thấy ID dự án");
        return;
    }

    const projects = StorageService.getData("projects");
    const currentProject = projects.find(project => project.id === selectedProjectId);

    if (currentProject) {
        const nameElement = document.querySelector(".project-name");
        const descElement = document.querySelector(".project-description");

        if (nameElement && descElement) {
            console.log('Tìm thấy dự án:', currentProject); 
            nameElement.textContent = currentProject.projectName;
            descElement.textContent = currentProject.projectDescription;
        } else {
            console.error("Không tìm thấy phần tử .project-name hoặc .project-description");
        }
    } else {
        console.error("Không tìm thấy dự án với ID:", selectedProjectId);
    }
}

function openAddMemberModal() {
    document.getElementById('add-member-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeAddMemberModal() {
    document.getElementById('add-member-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

function openMemberListModal() {
    const modal = document.getElementById('member-list-modal');
    const modalBody = modal.querySelector('.modal-body');
    
    const members = MemberService.getProjectMembers();
    console.log("Members in modal:", members); 
    
    let html = '<div class="member-list">';
    
    if (members.length === 0) {
        html += '<p class="no-members">Dự án chưa có thành viên nào</p>';
    } else {
        members.forEach(member => {
            if (!member || !member.name) {
                return;
            }
            
            html += `
                <div class="member-item">
                    <div class="member-avatar">${getInitials(member.name)}</div>
                    <div class="member-details">
                        <div class="member-name">${member.name}</div>
                        <div class="member-email">${member.email}</div>
                        <div class="member-role">${member.projectRole || member.role || 'Thành viên'}</div>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    
    modalBody.innerHTML = html;
    modal.style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeMemberListModal() {
    document.getElementById('member-list-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

function saveMember() {
    const emailInput = document.getElementById('member-email');
    const roleInput = document.getElementById('member-role');
    const errorText = document.querySelector('.error-text');
    
    const memberData = {
        email: emailInput.value.trim(),
        role: roleInput.value
    };
    errorText.style.display = 'none';

    // Validate input
    if (ValidationRules.isEmpty(memberData.email)) {
        errorText.textContent = "Email không được để trống";
        errorText.style.display = 'block';
        return;
    }

    if (!ValidationRules.isValidEmail(memberData.email)) {
        errorText.textContent = "Email không hợp lệ";
        errorText.style.display = 'block';
        return;
    }

    if (ValidationRules.isEmpty(memberData.role)) {
        errorText.textContent = "Vui lòng chọn vai trò";
        errorText.style.display = 'block';
        return;
    }

    if (MemberService.addMember(memberData)) {
        closeAddMemberModal();
        showSuccess("Thêm thành viên thành công");
        renderMemberList();
        fillAssigneeSelect(); 
        fillAssigneeSelect('edit-assignee'); 
        emailInput.value = '';
        roleInput.value = '';
    } else {
        errorText.textContent = "Thành viên đã tồn tại trong dự án";
        errorText.style.display = 'block';
    }
}

// Thêm hàm để lấy chữ cái đầu
function getInitials(name) {
    if (!name) return '';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}


function checkProjectAccess() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const selectedProjectId = parseInt(localStorage.getItem('selectedProjectId'));
    
    if (!currentUser || !selectedProjectId) {
        window.location.href = '../pages/management-page.html';
        return;
    }

    const projects = StorageService.getData('projects');
    const project = projects.find(p => p.id === selectedProjectId);
    
    // Thêm creator vào members nếu chưa có
    if (project && !project.members.some(m => m.userId === project.creatorId)) {
        project.members.push({
            userId: project.creatorId,
            role: "Project owner"
        });
        StorageService.saveData('projects', projects);
    }
    
    if (!project || !project.members.some(m => m.userId === currentUser.id)) {
        window.location.href = '../pages/management-page.html';
    }
}
