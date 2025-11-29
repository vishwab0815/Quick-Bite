import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

const Input = ({
    label,
    type = 'text',
    name,
    value,
    onChange,
    onFocus,
    onBlur,
    placeholder,
    error,
    helperText,
    required = false,
    disabled = false,
    icon,
    className = '',
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleFocus = (e) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const hasValue = value && value.length > 0;
    const isFloating = isFocused || hasValue;

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className={`relative ${className}`}>
            {/* Floating Label */}
            {label && (
                <motion.label
                    htmlFor={name}
                    animate={{
                        top: isFloating ? '-12px' : '16px',
                        fontSize: isFloating ? '12px' : '16px',
                        left: icon ? (isFloating ? '12px' : '44px') : '16px',
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className={`
                        absolute pointer-events-none z-10
                        ${isFloating
                            ? 'px-2 py-0.5 bg-white rounded-md shadow-sm font-semibold'
                            : 'font-medium'
                        }
                        ${error
                            ? 'text-red-600'
                            : isFloating
                                ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600'
                                : 'text-gray-500'
                        }
                    `}
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </motion.label>
            )}

            {/* Input Container */}
            <motion.div
                className="relative"
                animate={{
                    scale: isFocused ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
            >
                {/* Left Icon */}
                {icon && (
                    <motion.div
                        className={`absolute left-4 top-1/2 -translate-y-1/2 z-10
                            ${error
                                ? 'text-red-500'
                                : isFocused
                                    ? 'text-orange-500'
                                    : 'text-gray-400'
                            }
                        `}
                        animate={{
                            scale: isFocused ? 1.1 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                    >
                        {icon}
                    </motion.div>
                )}

                {/* Gradient Border on Focus */}
                {isFocused && !error && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 opacity-20 blur-sm -z-10"></div>
                )}

                {/* Input Field */}
                <input
                    id={name}
                    type={inputType}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={!label ? placeholder : ''}
                    disabled={disabled}
                    required={required}
                    className={`
                        w-full py-4
                        ${icon ? 'pl-12 pr-4' : 'px-4'}
                        ${type === 'password' ? 'pr-12' : ''}
                        border-2 rounded-xl
                        bg-white/50 backdrop-blur-sm
                        ${error
                            ? 'border-red-500 bg-red-50/50 focus:ring-4 focus:ring-red-100'
                            : isFocused
                                ? 'border-transparent bg-white shadow-lg shadow-orange-100/50 ring-2 ring-orange-500/50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                        }
                        focus:outline-none
                        transition-all duration-300
                        text-base text-gray-900 placeholder-gray-400
                        disabled:bg-gray-100 disabled:cursor-not-allowed
                        ${disabled ? 'opacity-60' : ''}
                    `}
                    {...props}
                />

                {/* Password Toggle */}
                {type === 'password' && (
                    <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`
                            absolute right-4 top-1/2 -translate-y-1/2
                            transition-all duration-200
                            ${isFocused
                                ? 'text-orange-500 hover:text-pink-500'
                                : 'text-gray-400 hover:text-gray-600'
                            }
                        `}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </motion.button>
                )}
            </motion.div>

            {/* Error Message or Helper Text */}
            <AnimatePresence>
                {(error || helperText) && (
                    <motion.p
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`mt-2 text-sm font-medium flex items-center gap-1.5
                            ${error ? 'text-red-600' : 'text-gray-500'}
                        `}
                    >
                        {error && (
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        {error || helperText}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};

Input.propTypes = {
    label: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    placeholder: PropTypes.string,
    error: PropTypes.string,
    helperText: PropTypes.string,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    icon: PropTypes.node,
    className: PropTypes.string,
};

export default Input;
