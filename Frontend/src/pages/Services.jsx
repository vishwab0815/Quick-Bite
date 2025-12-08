import { motion } from 'framer-motion';
import { FiClock, FiShoppingBag, FiDollarSign, FiHeadphones, FiCreditCard, FiStar, FiTruck, FiShield } from 'react-icons/fi';
import Navbar from './Navbar';
import Footer from './Footer';

const FoodDeliveryServices = () => {
  const services = [
    {
      icon: <FiClock className="w-10 h-10" />,
      title: "Lightning Fast Delivery",
      description: "Get food delivered in 30 minutes or less",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: <FiShoppingBag className="w-10 h-10" />,
      title: "500+ Restaurants",
      description: "Choose from top restaurants in your city",
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: <FiDollarSign className="w-10 h-10" />,
      title: "No Minimum Order",
      description: "Order as much or as little as you want",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <FiHeadphones className="w-10 h-10" />,
      title: "24/7 Support",
      description: "We're always here to help",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <FiCreditCard className="w-10 h-10" />,
      title: "Secure Payments",
      description: "100% secure payment options",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <FiStar className="w-10 h-10" />,
      title: "Premium Quality",
      description: "Exclusive discounts and offers",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      icon: <FiTruck className="w-10 h-10" />,
      title: "Live Tracking",
      description: "Track your order in real-time",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: <FiShield className="w-10 h-10" />,
      title: "Safe & Hygienic",
      description: "Contactless delivery available",
      color: "from-red-500 to-red-600"
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
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600">
              Our Services
            </span>
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            The fastest way to get your favorite food delivered right to your doorstep
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all group hover:scale-105"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${service.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{service.title}</h3>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-3xl p-12 text-center text-white shadow-2xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Order?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers and experience the best food delivery service
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/home"
              className="px-8 py-3 bg-white text-pink-600 font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Browse Menu
            </a>
            <a
              href="/register"
              className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full hover:bg-white/30 transition-all border-2 border-white hover:scale-105"
            >
              Sign Up Now
            </a>
          </div>
        </motion.div>
      </div>
      </div>

      <Footer />
    </div>
  );
};

export default FoodDeliveryServices;
