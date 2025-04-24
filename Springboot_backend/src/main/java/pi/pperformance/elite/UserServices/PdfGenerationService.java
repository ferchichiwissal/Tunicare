package pi.pperformance.elite.UserServices;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.CabinetDr;
import pi.pperformance.elite.entities.PrescribedMedications;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import com.lowagie.text.Image; // Import Image class
import java.nio.file.Files; // Import Files for checking signature existence
import java.nio.file.Paths; // Import Paths for checking signature existence
import java.time.LocalDate; // Import LocalDate for age calculation
import java.time.Period; // Import Period for age calculation
import java.time.ZoneId; // Import ZoneId for age calculation
// import java.awt.Color;

@Service
public class PdfGenerationService {

    // Constants can be defined here if needed, e.g., for font sizes, paths, colors

    public byte[] generatePrescriptionPdf(Consultation consultation) throws DocumentException, IOException {
        // Validate essential data
        if (consultation == null || consultation.getPrescribedMedications() == null || consultation.getPatient() == null || consultation.getCabinet() == null) {
            throw new IllegalArgumentException("Les données de consultation, prescription, patient ou cabinet sont manquantes.");
        }

        CabinetDr cabinet = consultation.getCabinet();
        Patient patient = consultation.getPatient();
        PrescribedMedications prescription = consultation.getPrescribedMedications();
        // Retrieve signature path from cabinet entity
        String signaturePath = cabinet.getSignatureImagePath();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter writer = PdfWriter.getInstance(document, baos);

        // Consider adding a PdfPageEventHelper for consistent headers/footers on all pages

        document.open();

        // --- Header ---
        // Basic header: Doctor's name. Enhance with address, logo etc. as needed.
        Paragraph header = new Paragraph("Dr. " + cabinet.getName());
        header.setAlignment(Element.ALIGN_LEFT);
        document.add(header);
        // Add cabinet address, phone, etc. if available
        // document.add(new Paragraph(cabinet.getAddress()));
        document.add(Chunk.NEWLINE); // Add spacing

        // --- Title ---
        Paragraph title = new Paragraph("Ordonnance Médicale", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(Chunk.NEWLINE);

        // --- Patient Info ---
        // Improved formatting for patient details
        document.add(new Paragraph("Patient: " + patient.getFirstName() + " " + patient.getLastName()));
        // Calculate and display age using the helper method
        if (patient.getBirthDate() != null) {
            document.add(new Paragraph("Âge: " + calculateAge(patient.getBirthDate()) + " ans"));
        } else {
            document.add(new Paragraph("Âge: Non spécifié"));
        }
        // Format the consultation date
        document.add(new Paragraph("Date de consultation: " + consultation.getDateConsultation().toString())); // Consider using a DateTimeFormatter for better format
        document.add(Chunk.NEWLINE);

        // --- Prescription Content ---
        // Clean basic HTML tags (<p>, </p>) before adding to the PDF
        String rawPrescriptionText = prescription.getPrescribedMedications() != null ? prescription.getPrescribedMedications() : "";
        // Simple cleaning: remove <p>, replace </p> with newline. For complex HTML, use a library like jsoup.
        String cleanedPrescriptionText = rawPrescriptionText
                                            .replaceAll("(?i)<p>", "") // Case-insensitive removal of <p>
                                            .replaceAll("(?i)</p>", "\n") // Case-insensitive replacement of </p> with newline
                                            .trim(); // Remove leading/trailing whitespace
        Paragraph prescriptionContent = new Paragraph(cleanedPrescriptionText);
        prescriptionContent.setAlignment(Element.ALIGN_JUSTIFIED); // Justify text for better readability
        document.add(prescriptionContent);
        document.add(Chunk.NEWLINE);
        document.add(Chunk.NEWLINE); // Add more spacing before signature

        // --- Signature ---
        Paragraph signatureLabel = new Paragraph("Signature du Médecin");
        signatureLabel.setAlignment(Element.ALIGN_RIGHT);
        document.add(signatureLabel);
        document.add(Chunk.NEWLINE); // Space between label and image

        // Check if signature path is provided and the file exists
        if (signaturePath != null && !signaturePath.trim().isEmpty()) {
            java.nio.file.Path path = Paths.get(signaturePath);
            if (Files.exists(path) && Files.isReadable(path)) {
                try {
                    Image signatureImage = Image.getInstance(signaturePath);
                    // Scale image to fit appropriately (e.g., 150 width, maintaining aspect ratio)
                    signatureImage.scaleToFit(150, 75); // Adjust size as needed
                    signatureImage.setAlignment(Element.ALIGN_RIGHT); // Align to the right
                    document.add(signatureImage);
                } catch (BadElementException | MalformedURLException e) {
                    // Log error and add placeholder text to PDF
                    System.err.println("Erreur de chargement de l'image de signature (format invalide ou chemin incorrect): " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Erreur: Image de signature invalide]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
                } catch (IOException e) {
                    // Log error and add placeholder text to PDF
                    System.err.println("Erreur d'entrée/sortie lors du chargement de l'image de signature: " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Erreur: Lecture de l'image de signature impossible]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
                }
            } else {
                // Log error and add placeholder text to PDF if file not found or not readable
                System.err.println("Fichier signature non trouvé ou illisible: " + signaturePath);
                document.add(new Paragraph("[Erreur: Fichier signature non trouvé (" + signaturePath + ")]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
            }
        } else {
            // Add placeholder text if no signature path is configured for the cabinet
            document.add(new Paragraph("[Signature non configurée pour ce cabinet]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
        }

        // --- Footer ---
        // Basic footer. Use PdfPageEventHelper for placement at the bottom of each page.
        Paragraph footer = new Paragraph("Contact: Tel: " + cabinet.getTel() + " | Email: " + cabinet.getDoctor().getEmail());
        footer.setAlignment(Element.ALIGN_CENTER);
        // document.add(footer); // This won't place it at the absolute bottom

        document.close(); // Closes the document and finishes writing
        writer.close(); // Closes the writer

        return baos.toByteArray(); // Return PDF content as byte array
    }

    // Helper method to calculate age from LocalDate birth date
    private int calculateAge(LocalDate birthLocalDate) {
        if (birthLocalDate == null) {
            // Return 0 or throw an exception, depending on desired handling for missing birth dates
            return 0;
        }
        // Calculate period between birth date and today's date
        return Period.between(birthLocalDate, LocalDate.now()).getYears();
    }

    // Consider adding helper methods for header/footer using PdfPageEventHelper for better PDF structure
    // e.g., private static class HeaderFooter extends PdfPageEventHelper { ... }
}
