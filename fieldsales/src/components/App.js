// ==================== src/App.js ====================
import React, { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  ShoppingCart,
  Phone,
  MapPin,
  Clock,
  Check,
  Search,
  Filter,
} from "lucide-react";

const App = () => {
  const [cart, setCart] = useState([]);
  const [currentStep, setCurrentStep] = useState("menu");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
    orderType: "delivery",
  });
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Your actual product data organized by medicine name with pack sizes
  const medicineData = {
    "Aarogya Tea": {
      category: "Herbal Teas",
      description: "Premium ayurvedic wellness tea blend",
      variants: [
        { sku: "HTART0100", pack: "100gm", price: 625.0 },
        { sku: "HTART1000NP0425", pack: "1000gm", price: 4840.0 },
      ],
    },
    Abhayarishtam: {
      category: "Arishtas",
      description: "Classical ayurvedic fermented medicine",
      variants: [{ sku: "CAABR0450NP0425", pack: "450ml", price: 150.0 }],
    },
    "Agasthya Rasayanam": {
      category: "Rasayanas",
      description: "Respiratory wellness formula",
      variants: [
        { sku: "CLAGR0250NP2201", pack: "250gm", price: 195.0 },
        { sku: "CLAGR0250NP0425", pack: "250gm", price: 244.0 },
      ],
    },
    "Aloe Vera Shampoo": {
      category: "Hair Care",
      description: "Natural aloe vera hair cleanser",
      variants: [
        { sku: "HCAVS0200NP0425", pack: "200ml", price: 407.0 },
        { sku: "HCAVS0500NP0425", pack: "500ml", price: 759.0 },
        { sku: "HCAVS5000NP0425", pack: "5000ml", price: 6929.0 },
      ],
    },
    "Amla Powder": {
      category: "Powders",
      description: "Pure amla powder for health and beauty",
      variants: [{ sku: "CCAM1000NP0425", pack: "1000gm", price: 2200.0 }],
    },
    "Amla Shikakai Shampoo": {
      category: "Hair Care",
      description: "Traditional hair care formula",
      variants: [
        { sku: "HCASS0200NP0425", pack: "200ml", price: 375.0 },
        { sku: "HCASS0500", pack: "500ml", price: 630.0 },
        { sku: "HCASS0500NP0425", pack: "500ml", price: 693.0 },
        { sku: "HCASS5000NP0425", pack: "5000ml", price: 6578.0 },
      ],
    },
    Amrutharishtam: {
      category: "Arishtas",
      description: "Immunity boosting fermented medicine",
      variants: [{ sku: "CAAMR0450NP0425", pack: "450ml", price: 157.0 }],
    },
    "Amruthotharam Kashayam": {
      category: "Kashayams",
      description: "Liquid ayurvedic decoction",
      variants: [{ sku: "CKATK0200NP0425", pack: "200ml", price: 182.0 }],
    },
    "Amruthotharam Kashayam Tablet": {
      category: "Tablets",
      description: "Convenient tablet form of kashayam",
      variants: [
        { sku: "KTATT0030NP0425", pack: "30 Pills", price: 126.0 },
        { sku: "KTATT0060", pack: "60 Pills", price: 210.0 },
        { sku: "KTATT0060NP0425", pack: "60 Pills", price: 250.0 },
      ],
    },
    "Hand Sanitizer - Arham Lemon Gel": {
      category: "Sanitizers",
      description: "Allopathy lemon gel hand sanitizer",
      variants: [
        { sku: "ALG100", pack: "100ml", price: 17.0 },
        { sku: "ALG200", pack: "200ml", price: 24.0 },
        { sku: "ALG5000", pack: "5000ml", price: 425.0 },
      ],
    },
    "Hand Sanitizer - Kairali Lemon Liquid": {
      category: "Sanitizers",
      description: "Allopathy lemon liquid hand sanitizer",
      variants: [
        { sku: "ALLNP0621100", pack: "100ml", price: 66.0 },
        { sku: "ALLNP0621500", pack: "500ml", price: 230.0 },
        { sku: "ALL5000", pack: "5000ml", price: 2500.0 },
      ],
    },
  };

  const categories = [
    "all",
    ...new Set(Object.values(medicineData).map((item) => item.category)),
  ];

  const getFilteredMedicines = () => {
    let filtered = Object.entries(medicineData);

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        ([name, data]) => data.category === selectedCategory
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        ([name, data]) =>
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          data.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const addToCart = (medicineName, variant) => {
    const cartItem = {
      id: variant.sku,
      name: medicineName,
      pack: variant.pack,
      price: variant.price,
      sku: variant.sku,
    };

    const existingItem = cart.find((item) => item.id === variant.sku);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === variant.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...cartItem, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, change) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSubmitOrder = async () => {
    setIsLoading(true);
    const orderNum = "AYUR-" + Date.now().toString().slice(-6);

    const orderData = {
      orderNumber: orderNum,
      customerInfo: customerInfo,
      cart: cart,
      totalAmount: getTotalPrice(),
      paymentMethod: "Cash on Delivery",
      timestamp: new Date().toISOString(),
    };

    try {
      // TODO: Replace with your Google Apps Script URL
      const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.status === "success") {
        setOrderNumber(orderNum);
        setOrderComplete(true);

        // Clear cart
        setCart([]);
        setCustomerInfo({
          name: "",
          phone: "",
          address: "",
          orderType: "delivery",
        });
      } else {
        throw new Error(result.message || "Order submission failed");
      }
    } catch (error) {
      console.error("Order submission failed:", error);
      alert("Order submission failed. Please try again or call us directly.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate WhatsApp link for order tracking
  const getWhatsAppLink = () => {
    const message = `Hello! I want to track my order ${orderNumber}. Thank you!`;
    const phoneNumber = "919876543210"; // Replace with your WhatsApp Business number
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Order Confirmed!
          </h2>
          <p className="text-gray-600 mb-4">Order #{orderNumber} received</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Estimated delivery time</p>
            <p className="text-lg font-semibold text-gray-800">
              2-3 business days
            </p>
          </div>
          <div className="space-y-3">
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Track via WhatsApp
            </a>
            <button
              onClick={() => {
                setOrderComplete(false);
                setCurrentStep("menu");
              }}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-green-700">Kappl Ayurveda</h1>
          <p className="text-sm text-gray-600">Authentic Ayurvedic Medicines</p>
        </div>
      </div>

      {currentStep === "menu" && (
        <div className="pb-24">
          {/* Search and Filter */}
          <div className="bg-white p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category === "all" ? "All Categories" : category}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine List */}
          <div className="space-y-4 p-4">
            {getFilteredMedicines().map(([medicineName, medicineData]) => (
              <div
                key={medicineName}
                className="bg-white rounded-lg shadow-sm overflow-hidden fade-in"
              >
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {medicineName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {medicineData.description}
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {medicineData.category}
                  </span>
                </div>

                {/* Pack Size Variants */}
                <div className="p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    Available Pack Sizes:
                  </p>
                  {medicineData.variants.map((variant) => (
                    <div
                      key={variant.sku}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {variant.pack}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({variant.sku})
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-green-600 mt-1">
                          ₹{variant.price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => addToCart(medicineName, variant)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {getFilteredMedicines().length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No medicines found matching your search.
              </p>
            </div>
          )}
        </div>
      )}

      {currentStep === "checkout" && (
        <div className="p-4 pb-32">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm mb-4 fade-in">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Order Summary</h2>
            </div>
            {cart.map((item) => (
              <div key={item.id} className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">Pack: {item.pack}</p>
                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                    <p className="text-green-600 font-semibold">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-600">
                    Subtotal: ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            <div className="p-4 bg-green-50">
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total</span>
                <span className="text-green-600">
                  ₹{getTotalPrice().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm mb-4 fade-in">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Delivery Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCustomerInfo({ ...customerInfo, orderType: "delivery" })
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    customerInfo.orderType === "delivery"
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Home Delivery
                </button>
                <button
                  onClick={() =>
                    setCustomerInfo({ ...customerInfo, orderType: "pickup" })
                  }
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    customerInfo.orderType === "pickup"
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Store Pickup
                </button>
              </div>

              <input
                type="text"
                placeholder="Patient/Customer Name"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              />

              {customerInfo.orderType === "delivery" && (
                <textarea
                  placeholder="Complete Delivery Address with Pincode"
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      address: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 h-24 resize-none transition-colors"
                />
              )}
            </div>
          </div>

          {/* Payment & Prescription */}
          <div className="bg-white rounded-lg shadow-sm mb-6 fade-in">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Payment & Prescription</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Payment Method:
                </p>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment"
                    className="mr-3"
                    defaultChecked
                  />
                  <span>Cash on Delivery</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="payment" className="mr-3" />
                  <span>UPI/Online Payment</span>
                </label>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center text-sm">
                  <input type="checkbox" className="mr-2" />
                  <span>I have a valid prescription (if required)</span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={
              !customerInfo.name ||
              !customerInfo.phone ||
              (customerInfo.orderType === "delivery" &&
                !customerInfo.address) ||
              isLoading
            }
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Placing Order..."
              : `Place Order - ₹${getTotalPrice().toFixed(2)}`}
          </button>
        </div>
      )}

      {/* Bottom Cart Bar */}
      {currentStep === "menu" && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
          <button
            onClick={() => setCurrentStep("checkout")}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-between hover:bg-green-700 transition-colors"
          >
            <div className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              <span>{getTotalItems()} items</span>
            </div>
            <span>₹{getTotalPrice().toFixed(2)} →</span>
          </button>
        </div>
      )}

      {/* Back Button for Checkout */}
      {currentStep === "checkout" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20">
          <button
            onClick={() => setCurrentStep("menu")}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            ← Continue Shopping
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
