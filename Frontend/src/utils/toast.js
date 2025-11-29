import { toast } from 'react-toastify';

// Toast configuration with custom styling
const toastConfig = {
    position: 'top-right',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
};

// Success toast
export const showSuccessToast = (message) => {
    toast.success(message, {
        ...toastConfig,
        className: 'bg-white',
        progressClassName: 'bg-gradient-to-r from-green-500 to-emerald-500',
    });
};

// Error toast
export const showErrorToast = (message) => {
    toast.error(message, {
        ...toastConfig,
        className: 'bg-white',
        progressClassName: 'bg-gradient-to-r from-red-500 to-pink-500',
    });
};

// Info toast
export const showInfoToast = (message) => {
    toast.info(message, {
        ...toastConfig,
        className: 'bg-white',
        progressClassName: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    });
};

// Warning toast
export const showWarningToast = (message) => {
    toast.warning(message, {
        ...toastConfig,
        className: 'bg-white',
        progressClassName: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    });
};

// Custom toast with icon
export const showToast = (message, type = 'default') => {
    const types = {
        success: showSuccessToast,
        error: showErrorToast,
        info: showInfoToast,
        warning: showWarningToast,
    };

    const toastFn = types[type] || toast;
    toastFn(message);
};
