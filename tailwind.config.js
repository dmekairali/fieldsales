module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4A7C59', // Soothing green
        'brand-secondary': '#8B4513', // Earthy brown
        'brand-accent': '#F4A261', // Warm accent
        'brand-light': '#F1F5F9', // Light background
        'brand-dark': '#2D3748', // Dark text
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
    },
  },
  plugins: [],
}
