export function registrationErrors(fields: { username: string; email: string; password: string; password_confirmation: string }): Record<string, string | undefined> {
  const { username, email, password, password_confirmation: confirmation } = fields;
  return {
    username: !/^[A-Za-z0-9_.]{3,30}$/.test(username.trim()) ? 'نام کاربری باید ۳ تا ۳۰ کاراکتر و فقط شامل حروف انگلیسی، عدد، _ یا نقطه باشد' : undefined,
    email: email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'ایمیل معتبر وارد کن یا این فیلد اختیاری را خالی بگذار' : undefined,
    password: password.length < 8 ? 'رمز عبور باید حداقل ۸ کاراکتر باشد' : undefined,
    password_confirmation: !confirmation ? 'تکرار رمز عبور الزامی است' : password !== confirmation ? 'رمز عبور و تکرار آن یکسان نیستند' : undefined,
  };
}
