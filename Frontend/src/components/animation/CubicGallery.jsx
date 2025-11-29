import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Constants
const FACE_SIZE = 3;
const ITEM_SIZE = 240;
const ITEM_DISTANCE = 40;

const CubicGallery = ({ imageData }) => {
    const galleryRef = useRef(null);
    const animationIdRef = useRef(0);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    let mouseX = 0, mouseY = 0;
    let angleX = 0, angleY = 0;

    useEffect(() => {
        if (imageData.length === 0) return;

        const items = galleryRef.current.children;
        const cellSize = ITEM_SIZE + ITEM_DISTANCE;
        const cubeSize = cellSize * FACE_SIZE;
        const origin = -cubeSize * 0.5 + cellSize * 0.5;
        let count = 0;

        const buildFace = (faceId) => {
            for (let i = 0; i < FACE_SIZE; i++) {
                for (let j = 0; j < FACE_SIZE; j++) {
                    const item = items[count++];
                    const x = j * cellSize + origin;
                    const y = i * cellSize + origin;
                    const z = cubeSize * 0.5;

                    let transform = `translateX(${x}px) translateY(${y}px) translateZ(${z}px)`;

                    switch (faceId) {
                        case 1: transform = `rotateY(180deg) ${transform}`; break;
                        case 2: transform = `rotateY(-90deg) ${transform}`; break;
                        case 3: transform = `rotateY(90deg) ${transform}`; break;
                        case 4: transform = `rotateX(90deg) ${transform}`; break;
                        case 5: transform = `rotateX(-90deg) ${transform}`; break;
                    }

                    item.style.transform = transform;
                }
            }
        };

        for (let i = 0; i < 6; i++) buildFace(i);

        angleX = angleY = mouseX = mouseY = 0;

        document.body.onmousemove = (e) => {
            mouseX = -((e.clientX / window.innerWidth) - 0.5) * 1.25;
            mouseY = ((e.clientY / window.innerHeight) - 0.5) * 1.25;
        };

        const animate = () => {
            angleX += mouseX;
            angleY += mouseY;
            galleryRef.current.style.transform = `translateZ(-1200px) rotateY(${angleX}deg) rotateX(${angleY}deg)`;
            animationIdRef.current = requestAnimationFrame(animate);
        };

        cancelAnimationFrame(animationIdRef.current);
        animate();

        return () => cancelAnimationFrame(animationIdRef.current);
    }, [imageData]);

    const openFullscreen = (url) => {
        setFullscreenImage(url);
        document.body.style.overflow = 'hidden';
    };

    const closeFullscreen = () => {
        setFullscreenImage(null);
        document.body.style.overflow = 'auto';
    };

    return (
        <div className="container my-8 relative">
            {/* Enhanced gradient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float1"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float2"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400 to-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-float3"></div>
            </div>

            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12 relative z-10"
            >
                <h2 className="text-4xl font-bold mb-3">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500">
                        3D Gallery Experience
                    </span>
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Move your mouse to explore our delicious dishes in an immersive 3D cube
                </p>
            </motion.div>

            <div className="cubic-gallery" ref={galleryRef}>
                {imageData.map((url, idx) => (
                    <div
                        key={idx}
                        className="cubic-gallery-item group transition-all duration-300 hover:scale-110 cursor-pointer overflow-hidden"
                        style={{
                            backgroundImage: `url(${url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                        onClick={() => openFullscreen(url)}
                    >
                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-pink-500/0 group-hover:from-orange-500/30 group-hover:to-pink-500/30 transition-all duration-300"></div>

                        {/* Border gradient */}
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-orange-500 group-hover:to-pink-500 rounded-xl transition-all duration-300"></div>
                    </div>
                ))}
            </div>

            {/* Enhanced Fullscreen Image Viewer */}
            <AnimatePresence>
                {fullscreenImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={closeFullscreen}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="relative w-full h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Gradient glow behind image */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3/4 h-3/4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full blur-3xl opacity-20"></div>
                            </div>

                            <motion.img
                                src={fullscreenImage}
                                alt="Fullscreen view"
                                className="relative max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            />

                            {/* Close button */}
                            <motion.button
                                onClick={closeFullscreen}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                className="absolute top-6 right-6 text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
                                aria-label="Close fullscreen"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </motion.button>

                            {/* Info overlay */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                                <p className="text-white text-sm font-medium">Click outside or press ESC to close</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                @keyframes float1 {
                    0%, 100% {
                        transform: translate(0, 0) rotate(0deg) scale(1);
                    }
                    33% {
                        transform: translate(30px, 20px) rotate(5deg) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 30px) rotate(-3deg) scale(0.9);
                    }
                }
                @keyframes float2 {
                    0%, 100% {
                        transform: translate(0, 0) rotate(0deg) scale(1);
                    }
                    33% {
                        transform: translate(-30px, -20px) rotate(-5deg) scale(1.1);
                    }
                    66% {
                        transform: translate(20px, -30px) rotate(3deg) scale(0.9);
                    }
                }
                @keyframes float3 {
                    0%, 100% {
                        transform: translate(-50%, -50%) rotate(0deg) scale(1);
                    }
                    33% {
                        transform: translate(calc(-50% + 20px), calc(-50% - 20px)) rotate(5deg) scale(1.05);
                    }
                    66% {
                        transform: translate(calc(-50% - 20px), calc(-50% + 20px)) rotate(-5deg) scale(0.95);
                    }
                }
                .animate-float1 { animation: float1 10s ease-in-out infinite; }
                .animate-float2 { animation: float2 12s ease-in-out infinite; }
                .animate-float3 { animation: float3 15s ease-in-out infinite; }

                .cubic-gallery-item {
                    position: relative;
                    border-radius: 16px;
                    box-shadow:
                        0 20px 25px -5px rgba(249, 115, 22, 0.1),
                        0 10px 10px -5px rgba(236, 72, 153, 0.1),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.1);
                }

                .cubic-gallery-item:hover {
                    box-shadow:
                        0 25px 50px -12px rgba(249, 115, 22, 0.3),
                        0 15px 20px -5px rgba(236, 72, 153, 0.2),
                        inset 0 0 0 2px rgba(249, 115, 22, 0.5);
                }
            `}</style>
        </div>
    );
};

export default CubicGallery;
