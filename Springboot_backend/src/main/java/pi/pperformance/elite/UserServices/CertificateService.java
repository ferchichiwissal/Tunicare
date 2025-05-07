package pi.pperformance.elite.UserServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import pi.pperformance.elite.UserRepository.CertificateRepository;
import pi.pperformance.elite.UserRepository.ConsultationRepository;
import pi.pperformance.elite.entities.Certificate;
// Removed iText HtmlConverter import
import pi.pperformance.elite.entities.Consultation;
import pi.pperformance.elite.exceptions.ResourceNotFoundException; // Assuming you have this exception

// Import Jsoup for HTML parsing
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

// Removed ByteArrayOutputStream import (now handled in PdfGenerationService)
import java.io.IOException;
import java.io.InputStream; // Import InputStream
import java.util.Optional;

@Service
public class CertificateService implements ICertificateService {

    private final CertificateRepository certificateRepository;
    private final ConsultationRepository consultationRepository;
    private final PdfGenerationService pdfGenerationService; // Inject PdfGenerationService

    @Autowired
    public CertificateService(CertificateRepository certificateRepository,
                              ConsultationRepository consultationRepository,
                              PdfGenerationService pdfGenerationService) { // Add PdfGenerationService
        this.certificateRepository = certificateRepository;
        this.consultationRepository = consultationRepository;
        this.pdfGenerationService = pdfGenerationService; // Assign PdfGenerationService
    }

    @Override
    @Transactional
    public Certificate saveCertificate(Long consultationId, MultipartFile file) throws IOException {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found with id: " + consultationId));

        // Check if a certificate already exists for this consultation and delete/update if necessary
        // Or decide on a strategy (e.g., disallow overwriting via this method)
        // For now, let's assume we replace if exists.
        Optional<Certificate> existingCertificateOpt = certificateRepository.findByConsultationIdConsultation(consultationId);
        existingCertificateOpt.ifPresent(certificateRepository::delete);

        // Parse HTML to get title and body, then generate PDF using PdfGenerationService
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String pdfFileName = originalFileName.replaceFirst("\\.html$", ".pdf"); // Ensure .html is replaced with .pdf

        try (InputStream htmlInputStream = file.getInputStream()) {
            // Parse HTML using Jsoup
            Document htmlDoc = Jsoup.parse(htmlInputStream, "UTF-8", ""); // Provide base URI if needed, "" is okay here
            // Extract title (assuming it's in h2 within div.cert-header)
            Element titleElement = htmlDoc.selectFirst("div.cert-header h2");
            String certificateTitle = (titleElement != null) ? titleElement.text() : "Certificat Médical"; // Default title

            // Extract body text (assuming it's the first <p> in div.cert-body-text)
            Element bodyElement = htmlDoc.selectFirst("div.cert-body-text p");
            String certificateBodyText = (bodyElement != null) ? bodyElement.html() : ""; // Use html() to keep potential simple formatting like <strong> if needed by PDF generator, or text() for plain text. Let's use text() for simplicity as PDF generator cleans it anyway.
            certificateBodyText = (bodyElement != null) ? bodyElement.text() : ""; // Use text() for plain text

            if (certificateBodyText.isEmpty()) {
                 throw new IOException("Could not extract certificate body text from the uploaded HTML.");
            }

            // Generate PDF using the service, passing extracted data
            byte[] pdfBytes = pdfGenerationService.generateCertificatePdf(consultation, certificateTitle, certificateBodyText);

            // Save the generated PDF
            Certificate certificate = new Certificate();
            certificate.setFileName(pdfFileName);
            certificate.setContentType("application/pdf");
            certificate.setData(pdfBytes);
            certificate.setConsultation(consultation);

            return certificateRepository.save(certificate);

        } catch (Exception e) { // Catch broader exceptions including DocumentException from PDF generation
            System.err.println("Error processing HTML, generating PDF, or saving certificate: " + e.getMessage());
            // Consider more specific exception handling or logging
            throw new IOException("Failed to process or save certificate as PDF: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Certificate> getCertificateByConsultationId(Long consultationId) {
        return certificateRepository.findByConsultationIdConsultation(consultationId); // Corrected method name
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Certificate> getCertificateById(Long certificateId) {
        return certificateRepository.findById(certificateId);
    }
}
