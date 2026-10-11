import React from 'react';
import { motion } from 'framer-motion';

const HeroSection = () => {

  const scrollToSection = () => {
    const targetPosition = window.innerHeight * 0.7;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative h-[80vh] bg-gradient-to-r from-red-600 to-orange-500 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{
          backgroundImage:
            "url('https://blog.swiggy.com/wp-content/uploads/2024/02/Masala-Dosa-1024x538.jpg')",
        }}
      ></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      {/* Content */}
      <div className="container h-full mx-auto flex flex-col md:flex-row justify-center items-center px-6 z-10 relative">
        {/* Left Text Content */}
        <motion.div
          className="text-center md:text-left mb-10 md:mb-0 md:w-1/2"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover Delicious Meals Delivered to You
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            Explore a wide range of mouthwatering dishes, crafted with love by top chefs.
          </p>
          <button
            onClick={scrollToSection}
            className="inline-block px-8 py-3 bg-white text-red-600 rounded-full font-bold shadow-lg hover:scale-105 transition-transform hover:shadow-xl"
          >
            Get Started
          </button>
        </motion.div>

        {/* Right Image */}
        <motion.div
          className="md:w-1/2 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.img
            src="https://content.jdmagicbox.com/v2/comp/bangalore/v3/080pxx80.xx80.200916215305.k1v3/catalogue/pa-pizza-chikka-adugodi-bangalore-pizza-outlets-1e6lcvo7k4.jpg"
            alt="Delicious Meal"
            className="rounded-lg shadow-2xl w-full max-w-md object-cover border-4 border-white"
            whileHover={{ scale: 1.03, rotate: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </motion.div>
      </div>

      {/* Floating Icon */}
      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </motion.div>
    </section>
  );
};

export default HeroSection;
