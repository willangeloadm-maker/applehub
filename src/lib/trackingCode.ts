// Generate tracking code in Brazilian Post Office (Correios) format
// Format: AA123456789BR (2 letters + 9 digits + BR)
export const generateTrackingCode = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = letters.charAt(Math.floor(Math.random() * letters.length)) + 
                 letters.charAt(Math.floor(Math.random() * letters.length));
  
  const numbers = Math.floor(100000000 + Math.random() * 900000000);
  
  return `${prefix}${numbers}BR`;
};
