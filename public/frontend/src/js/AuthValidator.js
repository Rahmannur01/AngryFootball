export class AuthValidator {
    static USERNAME_MIN_LENGTH = 3;
    static USERNAME_MAX_LENGTH = 20;
    static PASSWORD_MIN_LENGTH = 8;
    static PASSWORD_MAX_LENGTH = 128;
    static EMAIL_MAX_LENGTH = 254;
    static USERNAME_PATTERN = /^[\p{L}\p{N}_-]+$/u;
    static EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validate(mode, form, registrationStep = 'details') {
        if (mode === 'login') return this.validateLogin(form);
        if (registrationStep === 'email') {
            return this.validateRegistrationEmail(form);
        }
        if (registrationStep === 'code') {
            return this.validateRegistrationCode(form);
        }
        return this.validateRegistrationDetails(form);
    }

    validateLogin(form) {
        const errors = {};

        this.validateUsername(form.identifier, errors, 'identifier');
        this.validatePassword(form.password, errors);

        return errors;
    }

    validateRegistrationEmail(form) {
        const errors = {};
        this.validateEmail(form.email, errors);
        return errors;
    }

    validateRegistrationCode(form) {
        const errors = {};
        if (!/^\d{6}$/.test(form.code)) {
            errors.code = 'Введи шестизначный код из письма.';
        }
        return errors;
    }

    validateRegistrationDetails(form) {
        const errors = {};

        this.validateUsername(form.username, errors);
        this.validatePassword(form.password, errors);

        if (!form.passwordConfirmation) {
            errors.passwordConfirmation = 'Повтори пароль.';
        } else if (form.password !== form.passwordConfirmation) {
            errors.passwordConfirmation = 'Пароли не совпадают.';
        }

        return errors;
    }

    validateUsername(username, errors, field = 'username') {
        if (!username) {
            errors[field] = field === 'identifier'
                ? 'Введи никнейм.'
                : 'Придумай никнейм.';
            return;
        }

        if (
            username.length < AuthValidator.USERNAME_MIN_LENGTH
            || username.length > AuthValidator.USERNAME_MAX_LENGTH
        ) {
            errors[field] = `Никнейм должен содержать от ${AuthValidator.USERNAME_MIN_LENGTH} до ${AuthValidator.USERNAME_MAX_LENGTH} символов.`;
            return;
        }

        if (!AuthValidator.USERNAME_PATTERN.test(username)) {
            errors[field] = 'Используй буквы, цифры, дефис или нижнее подчёркивание.';
        }
    }

    validateEmail(email, errors) {
        if (!email) {
            errors.email = 'Введи email.';
            return;
        }

        if (!AuthValidator.EMAIL_PATTERN.test(email)) {
            errors.email = 'Проверь формат email.';
            return;
        }

        if (email.length > AuthValidator.EMAIL_MAX_LENGTH) {
            errors.email = `Email не должен быть длиннее ${AuthValidator.EMAIL_MAX_LENGTH} символов.`;
        }
    }

    validatePassword(password, errors) {
        if (!password) {
            errors.password = 'Введи пароль.';
            return;
        }

        if (
            password.length < AuthValidator.PASSWORD_MIN_LENGTH
            || password.length > AuthValidator.PASSWORD_MAX_LENGTH
        ) {
            errors.password = `Пароль должен содержать от ${AuthValidator.PASSWORD_MIN_LENGTH} до ${AuthValidator.PASSWORD_MAX_LENGTH} символов.`;
            return;
        }

        if (password.trim().length === 0) {
            errors.password = 'Пароль не может состоять только из пробелов.';
        }
    }
}
