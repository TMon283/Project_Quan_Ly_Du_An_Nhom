document.getElementById("login-btn").addEventListener("click", function(event) {
    event.preventDefault(); 

    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();
    let emailError = document.getElementById("email-error");
    let passwordError = document.getElementById("password-error");

    emailError.textContent = "";
    passwordError.textContent = "";

    let isValid = true;

    // Kiểm tra email
    if (email === "") {
        emailError.textContent = "Email không được để trống.";
        isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        emailError.textContent = "Email không hợp lệ.";
        isValid = false;
    }

    // Lấy danh sách user
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const foundUser = users.find(user => user.email === email);

    if (!foundUser) {
        emailError.textContent = "Email không tồn tại.";
        isValid = false;
    } else {
        // Kiểm tra mật khẩu nếu user tồn tại
        if (password === "") {
            passwordError.textContent = "Mật khẩu không được để trống.";
            isValid = false;
        } else if (password.length < 8) {
            passwordError.textContent = "Mật khẩu phải có ít nhất 8 ký tự.";
            isValid = false;
        } else if (foundUser.password !== password) {
            passwordError.textContent = "Mật khẩu không đúng.";
            isValid = false;
        }
    }

    if (isValid && foundUser) {
        // Lưu user đăng nhập hiện tại
        localStorage.setItem("currentUser", JSON.stringify(foundUser));

        // Hiển thị thông báo
        Swal.fire({
            title: "Đăng nhập thành công!",
            icon: "success",
            showConfirmButton: false,
        });

        // Chuyển trang
        setTimeout(() => {
            window.location.href = "../pages/management-page.html";
        }, 2000);
    }
});
