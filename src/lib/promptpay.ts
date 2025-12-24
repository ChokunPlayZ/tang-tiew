import jsQR from 'jsqr'

// Basic EMVCo BER-TLV parser
function parseEmvco(data: string) {
    let index = 0
    const tags: Record<string, string> = {}

    while (index < data.length) {
        const id = data.substring(index, index + 2)
        const length = parseInt(data.substring(index + 2, index + 4), 10)
        const value = data.substring(index + 4, index + 4 + length)

        tags[id] = value
        index += 4 + length
    }

    return tags
}

export function extractPromptPayId(qrString: string): { id: string | null; type: 'PHONE' | 'NATIONAL_ID' | 'EWALLET' | 'UNKNOWN' } {
    try {
        const tags = parseEmvco(qrString)

        // Tag 29: Merchant Account Information - Credit Transfer (PromptPay usually uses this for static QRs)
        // or Tag 26: Merchant Account Information (Generic)

        let targetTag = tags['29']

        if (!targetTag) {
            // Fallback to 26 if 29 is missing (some bilers)
            // Check if AID is PromptPay
            const tag26 = tags['26']
            if (tag26 && tag26.includes('A000000677010111')) {
                targetTag = tag26
            }
        }

        if (!targetTag) {
            return { id: null, type: 'UNKNOWN' }
        }

        // Subtags inside Tag 29/26
        const subTags = parseEmvco(targetTag)

        // Subtag 00: AID (must be A000000677010111 for PromptPay)
        if (subTags['00'] !== 'A000000677010111') {
            // Might not be standard PromptPay
        }

        // Subtag 01: Mobile Phone (0066...)
        // Subtag 02: National ID (13 chars)
        // Subtag 03: E-Wallet ID (15 chars)

        const rawValue = subTags['01'] || subTags['02'] || subTags['03']

        if (!rawValue) return { id: null, type: 'UNKNOWN' }

        // Check type
        if (rawValue.length === 13 && rawValue.startsWith('0066')) {
            // Phone: 0066812345678 -> 0812345678
            return { id: '0' + rawValue.substring(4), type: 'PHONE' }
        } else if (rawValue.length === 13) {
            // National ID
            return { id: rawValue, type: 'NATIONAL_ID' }
        } else if (rawValue.length === 15) {
            return { id: rawValue, type: 'EWALLET' }
        }

        return { id: rawValue, type: 'UNKNOWN' }

    } catch (e) {
        console.error('Error parsing QR', e)
        return { id: null, type: 'UNKNOWN' }
    }
}

// Client-side helper to read file
export async function readQrFromFile(file: File): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                resolve(code ? code.data : null);
            };
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
