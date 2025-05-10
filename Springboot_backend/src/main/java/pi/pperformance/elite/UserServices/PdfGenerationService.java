package pi.pperformance.elite.UserServices;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.entities.Patient;
import pi.pperformance.elite.entities.CabinetDr; // Keep for existing methods
import pi.pperformance.elite.entities.PrescribedMedications;
import pi.pperformance.elite.entities.MedicalExamination; // Added for new method
import pi.pperformance.elite.entities.DoctorCentreDexamen; // Added for new method
import pi.pperformance.elite.entities.CentreDexamen; // Added for new method
import pi.pperformance.elite.entities.RendezVous; // Added for new method


import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import com.lowagie.text.Image; // Import Image class
import java.nio.file.Files; // Import Files for checking signature existence
import java.nio.file.Paths; // Import Paths for checking signature existence
import java.time.LocalDate; // Import LocalDate for age calculation
import java.time.Period; // Import Period for age calculation
import java.time.ZoneId; // Import ZoneId for age calculation
import java.awt.Color; // Import Color

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

    // --- New method for generating Certificate PDF ---
    public byte[] generateCertificatePdf(Consultation consultation, String certificateTitle, String certificateBodyText) throws DocumentException, IOException {
        // Validate essential data
        if (consultation == null || consultation.getPatient() == null || consultation.getCabinet() == null) {
            throw new IllegalArgumentException("Les données de consultation, patient ou cabinet sont manquantes pour le certificat.");
        }
        if (certificateTitle == null || certificateTitle.trim().isEmpty() || certificateBodyText == null || certificateBodyText.trim().isEmpty()) {
            throw new IllegalArgumentException("Le titre ou le corps du certificat est manquant.");
        }

        CabinetDr cabinet = consultation.getCabinet();
        Patient patient = consultation.getPatient();
        String signaturePath = cabinet.getSignatureImagePath();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter writer = PdfWriter.getInstance(document, baos);

        document.open();

        // --- Header (Same as prescription) ---
        Paragraph header = new Paragraph("Dr. " + cabinet.getName()); // Assuming doctor name is from cabinet for now
        header.setAlignment(Element.ALIGN_LEFT);
        document.add(header);
        // Add cabinet address, phone, etc. if available
        document.add(Chunk.NEWLINE);

        // --- Title ---
        Paragraph title = new Paragraph(certificateTitle, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(Chunk.NEWLINE);

        // --- Patient Info (Same as prescription) ---
        document.add(new Paragraph("Patient: " + patient.getFirstName() + " " + patient.getLastName()));
        if (patient.getBirthDate() != null) {
            document.add(new Paragraph("Âge: " + calculateAge(patient.getBirthDate()) + " ans"));
        } else {
            document.add(new Paragraph("Âge: Non spécifié"));
        }
        // Use current date for certificate "Fait le"
        document.add(new Paragraph("Fait le: " + LocalDate.now().toString())); // Format as needed
        document.add(Chunk.NEWLINE);

        // --- Certificate Content ---
        // Clean basic HTML tags if any might sneak in (though ideally body text is plain)
        String cleanedBodyText = certificateBodyText
                                    .replaceAll("(?i)<p>", "")
                                    .replaceAll("(?i)</p>", "\n")
                                    .replaceAll("(?i)<strong>", "") // Remove strong tags if present
                                    .replaceAll("(?i)</strong>", "")
                                    .trim();
        Paragraph certificateContent = new Paragraph(cleanedBodyText);
        certificateContent.setAlignment(Element.ALIGN_JUSTIFIED);
        document.add(certificateContent);
        document.add(Chunk.NEWLINE);
        document.add(Chunk.NEWLINE);

        // --- Signature (Same as prescription) ---
        Paragraph signatureLabel = new Paragraph("Signature du Médecin");
        signatureLabel.setAlignment(Element.ALIGN_RIGHT);
        document.add(signatureLabel);
        document.add(Chunk.NEWLINE);

        if (signaturePath != null && !signaturePath.trim().isEmpty()) {
            java.nio.file.Path path = Paths.get(signaturePath);
            if (Files.exists(path) && Files.isReadable(path)) {
                try {
                    Image signatureImage = Image.getInstance(signaturePath);
                    signatureImage.scaleToFit(150, 75);
                    signatureImage.setAlignment(Element.ALIGN_RIGHT);
                    document.add(signatureImage);
                } catch (BadElementException | MalformedURLException e) {
                    System.err.println("Erreur de chargement de l'image de signature: " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Erreur: Image signature invalide]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
                } catch (IOException e) {
                    System.err.println("Erreur I/O lors du chargement de l'image de signature: " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Erreur: Lecture image signature impossible]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
                }
            } else {
                System.err.println("Fichier signature non trouvé ou illisible: " + signaturePath);
                document.add(new Paragraph("[Erreur: Fichier signature non trouvé]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
            }
        } else {
            document.add(new Paragraph("[Signature non configurée]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC)));
        }

        // --- Footer (Same as prescription) ---
        // Consider using PdfPageEventHelper for proper footer placement
        // Paragraph footer = new Paragraph("Contact: Tel: " + cabinet.getTel() + " | Email: " + cabinet.getDoctor().getEmail());
        // footer.setAlignment(Element.ALIGN_CENTER);
        // document.add(footer);

        document.close();
        writer.close();

        return baos.toByteArray();
    }

    public byte[] generateExaminationResultPdf(MedicalExamination medicalExamination) throws DocumentException, IOException {
        // Make the method more resilient to missing data
        // Instead of throwing an exception, we'll try to include what we can
        // and note missing information in the PDF.

        // Log received medicalExamination details
        if (medicalExamination == null) {
            System.err.println("PdfGenerationService: Received null medicalExamination object.");
        } else {
            System.err.println("PdfGenerationService: Generating PDF for exam ID " + medicalExamination.getIdExam());
            if (medicalExamination.getDoctorCentreDexamen() == null) {
                System.err.println("PdfGenerationService: medicalExamination.getDoctorCentreDexamen() is null.");
            } else {
                System.err.println("PdfGenerationService: DoctorCentreDexamen ID: " + medicalExamination.getDoctorCentreDexamen().getId());
                if (medicalExamination.getDoctorCentreDexamen().getCentreDexamen() == null) {
                    System.err.println("PdfGenerationService: medicalExamination.getDoctorCentreDexamen().getCentreDexamen() is null.");
                } else {
                    System.err.println("PdfGenerationService: CentreDexamen Name: " + medicalExamination.getDoctorCentreDexamen().getCentreDexamen().getName());
                }
                System.err.println("PdfGenerationService: Doctor Signature Path: " + medicalExamination.getDoctorCentreDexamen().getSignatureImagePath());
            }
            if (medicalExamination.getRendezVous() == null) {
                System.err.println("PdfGenerationService: medicalExamination.getRendezVous() is null.");
            } else if (medicalExamination.getRendezVous().getPatient() == null) {
                System.err.println("PdfGenerationService: medicalExamination.getRendezVous().getPatient() is null.");
            }
        }


        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter writer = PdfWriter.getInstance(document, baos);

        document.open();

        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
        Font smallItalicRedFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC, Color.RED);
        Font smallItalicFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC);


        // --- Header: Centre Information ---
        Paragraph centreHeader = new Paragraph();
        if (medicalExamination != null && medicalExamination.getDoctorCentreDexamen() != null && medicalExamination.getDoctorCentreDexamen().getCentreDexamen() != null) {
            CentreDexamen centre = medicalExamination.getDoctorCentreDexamen().getCentreDexamen();
            centreHeader.add(new Chunk(centre.getName() != null ? centre.getName() : "Centre non spécifié", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14)));
            centreHeader.add(Chunk.NEWLINE);
            if (centre.getAdress() != null) {
                centreHeader.add(new Chunk(centre.getAdress() + "\n", normalFont));
            }
            if (centre.getTel() != null) {
                centreHeader.add(new Chunk("Tel: " + centre.getTel(), normalFont));
            }
        } else {
            centreHeader.add(new Chunk("Informations du Centre Non Disponibles", smallItalicRedFont));
            centreHeader.add(Chunk.NEWLINE);
        }
        centreHeader.setAlignment(Element.ALIGN_LEFT);
        document.add(centreHeader);
        document.add(Chunk.NEWLINE);

        // --- Title ---
        Paragraph pdfTitle = new Paragraph("Compte Rendu d'Examen Médical", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
        pdfTitle.setAlignment(Element.ALIGN_CENTER);
        document.add(pdfTitle);
        document.add(Chunk.NEWLINE);

        // --- Patient Info ---
        if (medicalExamination != null && medicalExamination.getRendezVous() != null && medicalExamination.getRendezVous().getPatient() != null) {
            Patient patient = medicalExamination.getRendezVous().getPatient();
            document.add(new Paragraph("Patient: " + (patient.getFirstName() != null ? patient.getFirstName() : "") + " " + (patient.getLastName() != null ? patient.getLastName() : ""), FontFactory.getFont(FontFactory.HELVETICA, 12)));
            if (patient.getBirthDate() != null) {
                document.add(new Paragraph("Date de Naissance: " + patient.getBirthDate().toString(), normalFont));
                document.add(new Paragraph("Âge: " + calculateAge(patient.getBirthDate()) + " ans", normalFont));
            } else {
                document.add(new Paragraph("Date de Naissance: Non spécifiée", normalFont));
                document.add(new Paragraph("Âge: Non spécifié", normalFont));
            }
        } else {
            document.add(new Paragraph("Informations du Patient Non Disponibles", smallItalicRedFont));
        }
        document.add(Chunk.NEWLINE);
        
        // --- Date of Redaction ---
        if (medicalExamination != null && medicalExamination.getUpdatedAt() != null) {
            document.add(new Paragraph("Date de rédaction du résultat: " + medicalExamination.getUpdatedAt().toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString(), normalFont));
        } else {
             document.add(new Paragraph("Date de rédaction du résultat: Non spécifiée", normalFont));
        }
        document.add(Chunk.NEWLINE);

        // --- Examination Result ---
        Paragraph resultHeader = new Paragraph("Résultat de l'examen:", boldFont);
        document.add(resultHeader);
        document.add(Chunk.NEWLINE);

        String rawResultText = (medicalExamination != null && medicalExamination.getResultat() != null) ? medicalExamination.getResultat() : "Aucun résultat disponible.";
        String cleanedResultText = rawResultText
                                        .replaceAll("(?i)<p>", "")
                                        .replaceAll("(?i)</p>", "\n")
                                        .replaceAll("(?i)<strong>", "")
                                        .replaceAll("(?i)</strong>", "")
                                        .replaceAll("(?i)<em>", "")
                                        .replaceAll("(?i)</em>", "")
                                        .replaceAll("(?i)<u>", "")
                                        .replaceAll("(?i)</u>", "")
                                        .replaceAll("<br>", "\n")
                                        .replaceAll("<br/>", "\n")
                                        .trim();
        Paragraph resultContent = new Paragraph(cleanedResultText, FontFactory.getFont(FontFactory.HELVETICA, 11));
        resultContent.setAlignment(Element.ALIGN_JUSTIFIED);
        document.add(resultContent);
        document.add(Chunk.NEWLINE);
        document.add(Chunk.NEWLINE);

        // --- Signature ---
        Paragraph signatureLabel = new Paragraph("Signature du Médecin Rédacteur:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10));
        signatureLabel.setAlignment(Element.ALIGN_RIGHT);
        document.add(signatureLabel);

        String signaturePath = null;
        if (medicalExamination != null && medicalExamination.getDoctorCentreDexamen() != null) {
            DoctorCentreDexamen doctor = medicalExamination.getDoctorCentreDexamen();
            Paragraph doctorName = new Paragraph("Dr. " + (doctor.getFirstName() != null ? doctor.getFirstName() : "") + " " + (doctor.getLastName() != null ? doctor.getLastName() : ""), normalFont);
            doctorName.setAlignment(Element.ALIGN_RIGHT);
            document.add(doctorName);
            if (doctor.getSpeciality() != null && !doctor.getSpeciality().isEmpty()){
                Paragraph doctorSpeciality = new Paragraph(doctor.getSpeciality(), FontFactory.getFont(FontFactory.HELVETICA, 9, Font.ITALIC));
                doctorSpeciality.setAlignment(Element.ALIGN_RIGHT);
                document.add(doctorSpeciality);
            }
            signaturePath = doctor.getSignatureImagePath();
        } else {
            document.add(new Paragraph("[Informations du médecin rédacteur non disponibles]", smallItalicFont));
        }
        document.add(Chunk.NEWLINE);

        // Code pour ajouter l'image de signature (inchangé par rapport à votre version précédente)
         if (signaturePath != null && !signaturePath.trim().isEmpty()) {
            java.nio.file.Path path = Paths.get(signaturePath);
            if (Files.exists(path) && Files.isReadable(path)) {
                try {
                    Image signatureImage = Image.getInstance(signaturePath);
                    signatureImage.scaleToFit(150, 75); // Adjust size as needed
                    signatureImage.setAlignment(Element.ALIGN_RIGHT);
                    document.add(signatureImage);
                } catch (BadElementException | MalformedURLException e) {
                    System.err.println("Erreur de chargement de l'image de signature (format invalide ou chemin incorrect): " + signaturePath + " - " + e.getMessage());
                    document.add(new Paragraph("[Signature illisible]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC, Color.RED)));
                } catch (IOException e) {
                    System.err.println("Erreur d'entrée/sortie lors du chargement de l'image de signature: " + signaturePath + " - " + e.getMessage());
                     document.add(new Paragraph("[Erreur lecture signature]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC, Color.RED)));
                }
            } else {
                System.err.println("Fichier signature non trouvé ou illisible: " + signaturePath);
                document.add(new Paragraph("[Signature non trouvée]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC, Color.RED)));
            }
        } else {
            document.add(new Paragraph("[Signature non configurée pour ce médecin]", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.ITALIC, Color.RED)));
        }

        document.close();
        writer.close();

        return baos.toByteArray();
    }
}
