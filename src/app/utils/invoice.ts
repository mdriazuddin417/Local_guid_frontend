/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit";
import AppError from "../errorHelpers/AppError";

export interface IInvoiceData {
    transactionId: string;
    bookingDate: Date;
    userName: string;
    tourTitle: string;
    guestCount: number;
    totalAmount: number;
}

export const generatePdf = async (invoiceData: IInvoiceData): Promise<Buffer<ArrayBufferLike>> => {
    try {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: "A4", margin: 50 });
            const buffer: Uint8Array[] = [];

            doc.on("data", (chunk) => buffer.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffer)));
            doc.on("error", (err) => reject(err));

            // ===== HEADER =====
            doc
                .fontSize(26)
                .fillColor("#333")
                .text("INVOICE", { align: "center" });

            doc.moveDown(2);

            // ===== COMPANY INFO =====
            doc
                .fontSize(12)
                .fillColor("#666")
                .text("Crazy Tours", { align: "center" })
                .text("Brahmanbaria, Dhaka", { align: "center" })
                .text("Phone: 0171-111-1111", { align: "center" })
                .text("Email: info@crazytours.com", { align: "center" })
                .moveDown();

            // ===== ADDRESS =====
            doc
                .fontSize(12)
                .fillColor("#444")
                .text("Address", { align: "left" })
                .moveDown();

            doc
                .fontSize(12)
                .fillColor("#777")
                .text("Address line 1", { align: "left" })
                .moveDown();

            doc
                .fontSize(12)
                .fillColor("#777")
                .text("Address line 2", { align: "left" })
                .moveDown();

            // Line
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#e0e0e0");
            doc.moveDown();

            // ===== CUSTOMER + BOOKING INFO =====
            doc
                .fontSize(14)
                .fillColor("#333")
                .text("Booking Details", { underline: true });

            doc.moveDown(0.6);

            doc.fontSize(12).fillColor("#444");
            const details = [
                ["Transaction ID:", invoiceData.transactionId],
                ["Booking Date:", invoiceData.bookingDate.toDateString()],
                ["Customer Name:", invoiceData.userName],
                ["Tour Title:", invoiceData.tourTitle],
                ["Guests:", invoiceData.guestCount.toString()],
            ];

            details.forEach(([label, value]) => {
                doc.fillColor("#333").text(`${label} `, { continued: true });
                doc.fillColor("#777").text(value);
            });

            doc.moveDown();

            // ===== LINE SEPARATOR =====
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#e0e0e0");
            doc.moveDown(1.5);

            // ===== AMOUNT SECTION =====
            doc.fontSize(16).fillColor("#333").text("Payment Summary", { underline: true });
            doc.moveDown();

            doc
                .fontSize(14)
                .text("Total Amount:", { continued: true })
                .font("Helvetica-Bold")
                .text(` $${invoiceData.totalAmount.toFixed(2)}`);

            doc.font("Helvetica");

            doc.moveDown(2);

            // ===== FOOTER MESSAGE =====
            doc
                .fontSize(12)
                .fillColor("#555")
                .text("Thank you for booking with us!", { align: "center" });

            doc.moveDown();

            doc
                .fontSize(10)
                .fillColor("#999")
                .text("This invoice was generated automatically and does not require a signature.", { align: "center" });

            doc.end();
        });

    } catch (error: any) {
        console.log(error);
        throw new AppError(401, `Pdf creation error ${error.message}`);
    }
};
