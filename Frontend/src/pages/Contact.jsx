import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiSend } from 'react-icons/fi';
import { showToast } from '../utils/toast';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Contact() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate sending message
        setTimeout(() => {
            showToast.success(`Thank you ${form.name}! We'll get back to you soon.`);
            setForm({ name: '', email: '', message: '' });
            setLoading(false);
        }, 1000);
    };

    const contactInfo = [
        {
            icon: <FiMail className="w-6 h-6" />,
            title: 'Email',
            info: 'support@quickbite.com',
            link: 'mailto:support@quickbite.com'
        },
        {
            icon: <FiPhone className="w-6 h-6" />,
            title: 'Phone',
            info: '+1 (555) 123-4567',
            link: 'tel:+15551234567'
        },
        {
            icon: <FiMapPin className="w-6 h-6" />,
            title: 'Address',
            info: '123 Food Street, SF, CA 94102',
            link: '#'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
            <Navbar />

            {/* Add padding-top to account for fixed navbar height */}
            <div className="pt-16 md:pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl md:text-6xl font-bold mb-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600">
                            Get In Touch
                        </span>
                    </h1>
                    <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20"
                    >
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-pink-500 transition-colors"
                                    placeholder="Your Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-pink-500 transition-colors"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Message</label>
                                <textarea
                                    name="message"
                                    value={form.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-pink-500 transition-colors"
                                    rows="5"
                                    placeholder="Write your message here..."
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                        />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <FiSend className="w-5 h-5" />
                                        Send Message
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-6"
                    >
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Contact Information</h2>
                            <div className="space-y-4">
                                {contactInfo.map((item, index) => (
                                    <motion.a
                                        key={index}
                                        href={item.link}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 font-medium">{item.title}</p>
                                            <p className="text-gray-800 font-semibold">{item.info}</p>
                                        </div>
                                    </motion.a>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-3xl p-8 text-white shadow-xl"
                        >
                            <h3 className="text-2xl font-bold mb-4">Business Hours</h3>
                            <div className="space-y-2 text-white/90">
                                <p><strong>Monday - Friday:</strong> 9:00 AM - 10:00 PM</p>
                                <p><strong>Saturday - Sunday:</strong> 10:00 AM - 11:00 PM</p>
                                <p className="mt-4 pt-4 border-t border-white/20">
                                    💡 Our customer support team is available 24/7 to assist you!
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
            </div>

            <Footer />
        </div>
    );
}
