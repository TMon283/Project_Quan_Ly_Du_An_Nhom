// Lấy user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
}

// LocalStorage
function getProjectsFromLocalStorage() {
    return JSON.parse(localStorage.getItem("projects")) || [];
}

function saveProjectsToLocalStorage(projects) {
    localStorage.setItem("projects", JSON.stringify(projects));
}

// Lọc Projects theo userId
function getProjectsOwnedByUser(userId) {
    const allProjects = getProjectsFromLocalStorage() || [];

    return allProjects.filter(project => {
        if (!project.members || !Array.isArray(project.members)) return false;

        return project.members.some(member =>
            member.userId === userId && member.role === "Project owner"
        );
    });
}


const itemsPerPage = 9;
let currentPage = 1;

// Render Projects
function renderProjectsWithPagination(projectList) {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedProjects = projectList.slice(start, end);
    renderProjects(paginatedProjects);
    renderPagination(projectList);
}

function renderProjects(projectList) {
    const tableBody = document.querySelector(".project-list-table tbody");
    if (!tableBody) {
        console.error("Không tìm thấy bảng danh sách dự án");
        return;
    }
    
    tableBody.innerHTML = "";

    if (projectList.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `
            <td colspan="3" style="text-align: center;">Không có dự án nào</td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }

    projectList.forEach(project => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="left">${project.id}</td>
            <td class="center">${project.projectName}</td>
            <td class="right">
                <button class="edit-btn" onclick="editProject(${project.id})">Sửa</button>
                <button class="delete-btn" onclick="showDeleteModal(${project.id})">Xóa</button>
                <button class="detail-btn" onclick="goToDetailPage(${project.id})">Chi tiết</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Phân trang
function renderPagination(projectList) {
    const totalPages = Math.ceil(projectList.length / itemsPerPage);
    const paginationContainer = document.querySelector(".pagination");
    paginationContainer.innerHTML = "";

    const prevButton = document.createElement("button");
    prevButton.innerText = "<";
    prevButton.classList.add("page-btn", "prev-btn");
    if (currentPage === 1) prevButton.classList.add("disabled");
    prevButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderProjectsWithPagination(projectList);
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.innerText = i;
        button.classList.add("page-btn");
        if (i === currentPage) button.classList.add("active");
        button.addEventListener("click", () => {
            currentPage = i;
            renderProjectsWithPagination(projectList);
        });
        paginationContainer.appendChild(button);
    }

    const nextButton = document.createElement("button");
    nextButton.innerText = ">";
    nextButton.classList.add("page-btn", "next-btn");
    if (currentPage === totalPages) nextButton.classList.add("disabled");
    nextButton.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProjectsWithPagination(projectList);
        }
    });
    paginationContainer.appendChild(nextButton);
}

// Điều hướng sang trang chi tiết
function goToDetailPage(projectId) {
    localStorage.setItem("selectedProjectId", projectId);
    window.location.href = "../pages/detail-page.html";
}

// Đóng mở modal
const modal = document.getElementById("project-modal");
const deleteModal = document.getElementById("delete-modal");

const addProjectBtn = document.getElementById("add-project-btn");
const closeModalBtn = document.getElementById("close-modal");
const cancelBtn = document.getElementById("cancel-btn");

const projectNameInput = document.getElementById("project-name");
const projectDescriptionInput = document.getElementById("project-description");
const modalTitle = document.getElementById("modal-title");

let isEditMode = false;
let editingProjectId = null;
let projectIdToDelete = null;

function resetProjectModal() {
    projectNameInput.value = "";
    projectDescriptionInput.value = "";
    document.getElementById("project-name-error").textContent = "";
}

addProjectBtn.addEventListener("click", () => {
    isEditMode = false;
    editingProjectId = null;
    modalTitle.textContent = "Thêm dự án";
    resetProjectModal();
    modal.style.display = "flex";
});

closeModalBtn.addEventListener("click", () => (modal.style.display = "none"));
cancelBtn.addEventListener("click", () => (modal.style.display = "none"));

document.getElementById("cancel-delete-btn").addEventListener("click", () => {
    deleteModal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === deleteModal) deleteModal.style.display = "none";
});

// Show modal xóa dự án
function showDeleteModal(projectId) {
    projectIdToDelete = projectId;
    deleteModal.style.display = "flex";
}

// Sửa dự án (dữ liệu đã lưu hiện lên, sau đó cho phép sửa)
function editProject(projectId) {
    const allProjects = getProjectsFromLocalStorage();
    const project = allProjects.find(p => p.id === projectId);

    if (project) {
        isEditMode = true;
        editingProjectId = projectId;
        projectNameInput.value = project.projectName;
        projectDescriptionInput.value = project.projectDescription;
        modalTitle.textContent = "Chỉnh sửa dự án";
        modal.style.display = "flex";
    }
}

// Lưu dự án (thêm hoặc sửa)
document.getElementById("save-project-btn").addEventListener("click", () => {
    const name = projectNameInput.value.trim();
    const description = projectDescriptionInput.value.trim();
    const nameError = document.getElementById("project-name-error");
    const descError = document.getElementById("project-description-error");

    let isValid = true;

    if (!name) {
        nameError.textContent = "Tên dự án không được để trống";
        isValid = false;
    } else if (name.length > 60) {
        nameError.textContent = "Tên dự án không được vượt quá 60 ký tự";
        isValid = false;
    } else if (name.length < 20) {
        nameError.textContent = "Tên dự án phải dài tối thiểu 20 ký tự";
        isValid = false;
    } else {
        nameError.textContent = "";
    }
    if (description.length > 120) {
        descError.textContent = "Mô tả dự án không được vượt quá 120 ký tự";
        isValid = false;
    } else if (description.length < 30) {
        descError.textContent = "Mô tả dự án phải dài tối thiểu 30 ký tự";
        isValid = false;
    } else {
        descError.textContent = "";
    }

    if (!isValid) return;

    const currentUser = getCurrentUser();
    const allProjects = getProjectsFromLocalStorage();

    if (isEditMode) {
        const project = allProjects.find(p => p.id === editingProjectId);
        if (project) {
            project.projectName = name;
            project.projectDescription = description;
        }
    } else {
        const maxId = allProjects.reduce((max, p) => Math.max(max, p.id), 0);
        const newProject = {
            id: maxId + 1,
            projectName: name,
            projectDescription: description,
            status: "Đang thực hiện",
            createdDate: new Date().toISOString().split('T')[0],
            members: [
                {
                    userId: currentUser.id,
                    role: "Project owner"
                }
            ],
            tasks: []  // Thêm mảng tasks
        };
        allProjects.push(newProject);
    }
    saveProjectsToLocalStorage(allProjects);
    const userProjects = getProjectsOwnedByUser(currentUser.id);
    const totalPages = Math.ceil(userProjects.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    renderProjectsWithPagination(userProjects);
    modal.style.display = "none";
    resetProjectModal();
});


// Xóa dự án
document.getElementById("confirm-delete-btn").addEventListener("click", () => {
    if (projectIdToDelete !== null) {
        let projects = getProjectsFromLocalStorage();
        projects = projects.filter(p => p.id !== projectIdToDelete);
        saveProjectsToLocalStorage(projects);
        const userProjects = getProjectsOwnedByUser(getCurrentUser().id);
        const totalPages = Math.ceil(userProjects.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        renderProjectsWithPagination(userProjects);
    }
    deleteModal.style.display = "none";
    document.getElementById("close-delete-modal").addEventListener("click", () => {
        deleteModal.style.display = "none";
    });
    
    document.getElementById("cancel-delete-btn").addEventListener("click", () => {
        deleteModal.style.display = "none";
    });
});

// Tìm kiếm dự án
document.getElementById("find-project").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const currentUser = getCurrentUser();
    const allProjects = getProjectsOwnedByUser(currentUser.id);
    const filtered = allProjects.filter(p =>
        p.projectName.toLowerCase().includes(keyword)
    );
    currentPage = 1;
    renderProjectsWithPagination(filtered);
});

// Khởi tạo trang
document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo dữ liệu mẫu
    initializeSampleData();

    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert("Bạn chưa đăng nhập!");
        window.location.href = "../pages/login.html";
        return;
    }

    // Lấy danh sách dự án của người dùng hiện tại
    const userProjects = getProjectsOwnedByUser(currentUser.id);
    
    // Render danh sách dự án với phân trang
    renderProjectsWithPagination(userProjects);

    // Ẩn các modal
    const modal = document.getElementById("project-modal");
    const deleteModal = document.getElementById("delete-modal");
    if (modal) modal.style.display = "none";
    if (deleteModal) deleteModal.style.display = "none";
});

function initializeSampleData() {
    // Khởi tạo dữ liệu người dùng mẫu nếu chưa có
    if (!localStorage.getItem("currentUser")) {
        const sampleUser = {
            id: 1,
            name: "An Nguyễn",
            email: "nguyenquangan@gmail.com"
        };
        localStorage.setItem("currentUser", JSON.stringify(sampleUser));
    }

    // Khởi tạo dữ liệu dự án mẫu nếu chưa có
    if (!localStorage.getItem("projects")) {
        const sampleProjects = [
            {
                id: 1,
                projectName: "Xây dựng website thương mại điện tử",
                projectDescription: "Dự án nhằm phát triển một nền tảng thương mại điện tử hoàn chỉnh với các chức năng mua bán, thanh toán và quản lý sản phẩm.",
                members: [
                    {
                        userId: 1,
                        role: "Project owner"
                    }
                ]
            }
        ];
        localStorage.setItem("projects", JSON.stringify(sampleProjects));
    }
}
