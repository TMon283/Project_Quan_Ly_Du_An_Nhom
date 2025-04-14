let users = JSON.parse(localStorage.getItem("users")) || [];
function showError(element, message) {
    element.textContent = message;
    element.style.visibility = "visible";
}

function hideError(element) {
    element.textContent = "";
    element.style.visibility = "hidden";
}

document.getElementById("register-button").addEventListener("click", function(event) {
    event.preventDefault();
    let fullname = document.getElementById("fullname").value.trim();
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();
    let confirmPassword = document.getElementById("confirm-password").value.trim();

    let fullnameError = document.getElementById("fullname-error");
    let emailError = document.getElementById("email-error");
    let passwordError = document.getElementById("password-error");
    let confirmPasswordError = document.getElementById("confirm-password-error");

    // Ẩn lỗi trước khi kiểm tra lại
    hideError(fullnameError);
    hideError(emailError);
    hideError(passwordError);
    hideError(confirmPasswordError);

    let isValid = true;

    if (fullname === "") {
        showError(fullnameError, "Họ và tên không được để trống.");
        isValid = false;
    }

    if (email === "") {
        showError(emailError, "Email không được để trống.");
        isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        showError(emailError, "Email không hợp lệ.");
        isValid = false;
    }
                                                                                                                                                                                                                
    if (password === "") {
        showError(passwordError, "Mật khẩu không được để trống.");
        isValid = false;
    } else if (password.length < 8) {
        showError(passwordError, "Mật khẩu phải có ít nhất 8 ký tự.");
        isValid = false;
    }

    if (confirmPassword === "") {
        showError(confirmPasswordError, "Vui lòng nhập lại mật khẩu.");
        isValid = false;
    } else if (confirmPassword !== password) {
        showError(confirmPasswordError, "Mật khẩu xác nhận không khớp.");
        isValid = false;
    }

    const emailExists = users.some(user => user.email === email); 
    if (emailExists) {
        showError(emailError, "Email đã tồn tại.");
        isValid = false;
    }

    const user = {
        id: users.length + 1,
        fullname: fullname,
        email: email,
        password: password,
        // Thêm các trường này
        role: "User",
        projects: []  // Danh sách dự án tham gia
    };

    if (isValid) {
        users.push(user);
        localStorage.setItem("users", JSON.stringify(users));
        Swal.fire({
            title: "Đăng ký thành công!",
            icon: "success",
            draggable: true,
            showConfirmButton: false,
        });
        setTimeout(() => {
            window.location.href = "../pages/login.html";
        }, 2000);
    }
});