module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4A7C59', 
        'brand-secondary': '#8B4513', 
        'brand-accent': '#F4A261', 
        'brand-light': '#F1F5F9', 
        'brand-dark': '#2D3748', 
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
    },
  },
  plugins: [],
}
