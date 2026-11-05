/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // Palette drawn from the LexisNexis UK site, mapped to Tracewire roles
        ink: '#00172E',      // companies, primary text
        nexis: { DEFAULT: '#006EBB', dark: '#005A99', wash: '#E0F2FF' }, // officers, actions, traced path
        teal: { DEFAULT: '#2F9191', wash: '#DCF5F5' },                  // people with significant control
        alert: '#E8171F',    // high risk only
        amber: '#E07B00',    // medium risk
        canvas: '#F0F3F5',
        rail: '#FAFBFC',
        line: '#E5EBF0',
        muted: '#455A64',
      },
    },
  },
  plugins: [],
}
