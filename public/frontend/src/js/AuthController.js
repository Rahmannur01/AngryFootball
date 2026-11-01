export class AuthController {
    constructor({ vue, validator, api, session, location = window.location }) {
        this.vue = vue;
        this.validator = validator;
        this.api = api;
        this.session = session;
        this.location = location;
        this.state = vue.reactive({
            isCheckingSession: true,
            mode: 'login',
            forms: {
                login: {
                    identifier: '',
                    password: ''
                },
                register: {
                    username: '',
                    email: '',
                    password: '',
                    passwordConfirmation: ''
                }
            },
            errors: {},
            visiblePasswords: {
                password: false,
                passwordConfirmation: false
            },
            notice: {
                type: '',
                text: ''
            },
            user: null,
            isSubmitting: false
        });
    }

    async initialize() {
        const token = this.session.getToken();

        if (!token) {
            this.state.isCheckingSession = false;
            return;
        }

        try {
            await this.api.getProfile(token);
            this.location.assign('./home.html');
        } catch (error) {
            if (error.status === 401) {
                this.session.clear();
            } else {
                this.state.notice = {
                    type: 'error',
                    text: error.message || 'Не удалось проверить авторизацию.'
                };
            }

            this.state.isCheckingSession = false;
        }
    }

    get activeForm() {
        return this.state.forms[this.state.mode];
    }

    get submitLabel() {
        if (this.state.isSubmitting) return 'Проверяем…';
        return this.state.mode === 'login' ? 'Войти' : 'Создать аккаунт';
    }

    setMode(mode) {
        if (!['login', 'register'].includes(mode)) return;

        this.state.mode = mode;
        this.state.errors = {};
        this.state.notice = { type: '', text: '' };
        this.state.visiblePasswords.password = false;
        this.state.visiblePasswords.passwordConfirmation = false;
    }

    clearError(field) {
        if (!this.state.errors[field]) return;

        const nextErrors = { ...this.state.errors };
        delete nextErrors[field];
        this.state.errors = nextErrors;
    }

    togglePassword(field) {
        if (!(field in this.state.visiblePasswords)) return;
        this.state.visiblePasswords[field] = !this.state.visiblePasswords[field];
    }

    passwordType(field) {
        return this.state.visiblePasswords[field] ? 'text' : 'password';
    }

    passwordToggleLabel(field) {
        return this.state.visiblePasswords[field]
            ? 'Скрыть пароль'
            : 'Показать пароль';
    }

    async submit() {
        const errors = this.validator.validate(this.state.mode, this.activeForm);
        this.state.errors = errors;
        this.state.notice = { type: '', text: '' };

        if (Object.keys(errors).length > 0) {
            this.focusFirstInvalidField();
            return;
        }

        this.state.isSubmitting = true;

        try {
            const token = await this.api.submit(
                this.state.mode,
                { ...this.activeForm }
            );
            this.session.setToken(token.access_token);

            const user = await this.api.getProfile(token.access_token);
            this.state.user = user;
            this.clearPasswords();
            this.state.notice = {
                type: 'success',
                text: `Добро пожаловать, ${user.username}.`
            };
            this.location.assign('./home.html');
        } catch (error) {
            if (error.status === 401) {
                this.session.clear();
            }

            if (Object.keys(error.fieldErrors || {}).length > 0) {
                this.state.errors = error.fieldErrors;
                this.focusFirstInvalidField();
            }

            this.state.notice = {
                type: 'error',
                text: error.message || 'Не удалось обработать форму. Попробуй ещё раз.'
            };
        } finally {
            this.state.isSubmitting = false;
        }
    }

    clearPasswords() {
        this.state.forms.login.password = '';
        this.state.forms.register.password = '';
        this.state.forms.register.passwordConfirmation = '';
    }

    focusFirstInvalidField() {
        this.vue.nextTick(() => {
            document.querySelector('[aria-invalid="true"]')?.focus();
        });
    }

    expose() {
        return {
            state: this.state,
            activeForm: this.vue.computed(() => this.activeForm),
            submitLabel: this.vue.computed(() => this.submitLabel),
            setMode: this.setMode.bind(this),
            clearError: this.clearError.bind(this),
            togglePassword: this.togglePassword.bind(this),
            passwordType: this.passwordType.bind(this),
            passwordToggleLabel: this.passwordToggleLabel.bind(this),
            submit: this.submit.bind(this)
        };
    }
}
