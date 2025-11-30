import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import Categories from './Categories';
import Cards from '../components/cards';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Footer from './Footer';
import ItemsSection from './ItemsSection';
import CubicGallery from '../components/animation/CubicGallery';
import SearchInput from '../components/animation/SearchInput';
import Animate from './Animate';

const Home = () => {
    const navigate = useNavigate();
    const [Item, setItem] = useState("Breakfast");
    const [foodData, setFoodData] = useState([]);
    const [count, setCount] = useState(0);
    const [user, setUser] = useState(null);


    const [data, setData] = useState({ imageData: [] });

    const setImageData = (data) => {
        setData({ imageData: data });
    };



    const checkAuth = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                withCredentials: true
            });
            setUser(res.data.user);
        } catch (error) {
            console.error("Authentication error:", error);
            navigate('/signin');
        }
    };

    useEffect(() => {
        checkAuth();
    }, [navigate]);

    useEffect(() => {
        if (user) {
            const fetchData = async () => {
                try {
                    const response = await axios.get(
                        `${import.meta.env.VITE_API_URL}/fooditems/meal-type/${Item}`
                    );
                    setCount(response.data.count);
                    setFoodData(response.data.data || []);
                } catch (err) {
                    console.log(err);
                }
            };
            fetchData();
        }
    }, [Item, user]);

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            rotate: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear"
                            },
                            scale: {
                                duration: 1.5,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }
                        }}
                        className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent"
                    />
                    <p className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">Loading...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white  ">
            <Navbar user={user} />

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                <HeroSection />
            </motion.div>
            <ItemsSection />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
                <div className="text-center mb-8 ">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Discover Delicious Meals</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Explore our curated selection of dishes tailored to your taste and time of day
                    </p>
                </div>
                <Categories Item={Item} setItem={setItem} />   
            </motion.div>
            
            <motion.div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pb-16"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.1,
                        }
                    }
                }}
            >
                {foodData.map((item, index) => (
                    <motion.div
                        key={item.id}
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        whileHover={{
                            y: -6,
                            scale: 1.02,
                            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)"
                        }}
                        className="cursor-pointer"
                    >
                        <Cards
                            onClick={() => navigate(`/food/${item.id}`)}
                            index={index}
                            foodData={foodData}
                        />
                    </motion.div>
                ))}
            </motion.div>
            <Animate/>
            <Footer />

        </div>
    );
};

export default Home;
