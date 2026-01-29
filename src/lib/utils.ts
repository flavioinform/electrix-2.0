import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatRut = (rut: string): string => {
    // Remove all characters that are not numbers or 'k'/'K'
    const cleanRut = rut.replace(/[^0-9kK]/g, '');

    if (cleanRut.length < 2) return cleanRut;

    // Get the body and the verification digit
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    // Format the body with dots
    let formattedBody = '';
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
        if (j > 0 && j % 3 === 0) {
            formattedBody = '.' + formattedBody;
        }
        formattedBody = body[i] + formattedBody;
    }

    return `${formattedBody}-${dv}`;
};
