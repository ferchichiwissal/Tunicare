import React, { Suspense } from 'react'; // Import Suspense
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './component/Layout'; // Import the new Layout component
import RegistrationForm from "./inscription/RegistrationForm";
import ConfirmationPage from "./inscription/ConfirmationPage";
//import Homepage from "./home/HelloWorld";

import Template from "./component/template"
import Login from "./login/Login";
import Logout from './logout/logout';
import ResetPass from "./login/ResetPass";

// Removed duplicate React import
import UserManagement from "./Interface/CRUD users/changerole"; // Import AddForm here

import CompteValide from "./Interface/CRUD users/Tovalidate"; // Import AddForm here
import UserList from "./Interface/CRUD users/Users Management";
import EditUserForm from "./Interface/CRUD users/EditUserForm";
import Dashboard from "./Interface/dashboard";
import AddForm from "./Interface/CRUD users/AddForm";
import AddCabinetForm from "./Interface/CRUD users/AddCabinetForm";
import CabinetList from "./Interface/CRUD users/CabinetList";
import EditCabinetForm from "./Interface/CRUD users/EditCabinetForm"; // Import EditCabinetForm
import ComptenotValide from "./Interface/CRUD users/bloque";
import ResetPasswordPage from "./login/ResetPasswordPage";
import ChangePassword from './Interface/ChangePassword'; // Import ChangePassword component
import ProtectedLayout from './utils/ProtectedLayout'; // Assuming ProtectedLayout exists
import { ThemeProvider } from './utils/ThemeContext'; // Import ThemeProvider
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import Activation from './Interface/CRUD users/Activation'; // Import the new Activation component

// Import CentreDexamen components
import CentreDexamenList from './Interface/CRUD_Centres/CentreDexamenList';
import AddCentreDexamenForm from './Interface/CRUD_Centres/AddCentreDexamenForm';
import EditCentreDexamenForm from './Interface/CRUD_Centres/EditCentreDexamenForm';
import RegisterDoctorCentreForm from './Interface/CRUD_Centres/RegisterDoctorCentreForm';
import EditDoctorCentreForm from './Interface/CRUD users/EditDoctorCentreForm'; // Import the new form
import ConsultationPage from './Interface/Appointments/ConsultationPage'; // Import ConsultationPage
import MedicalExaminationForm from './Interface/Appointments/MedicalExaminationForm'; // Import MedicalExaminationForm
import ConsultationDashboard from './Interface/Appointments/ConsultationDashboard'; // Import ConsultationDashboard
import OrdonnanceEditPage from './Interface/Appointments/OrdonnanceEditPage'; // Import OrdonnanceEditPage
import MyConsultationsPage from './Interface/Appointments/MyConsultationsPage'; // Import MyConsultationsPage
import MyExaminationsPage from './Interface/Appointments/MyExaminationsPage'; // Import MyExaminationsPage
import AddAppointmentForm from './Interface/Appointments/AddAppointmentForm'; // Import AddAppointmentForm
import MyAppointments from './Interface/Appointments/MyAppointments'; // Import MyAppointments
import ManageAppointments from './Interface/Appointments/ManageAppointments'; // Import ManageAppointments
import CabinetSettingsPage from './Interface/CabinetSettingsPage'; // Import the new settings page
import CertificatePage from './Interface/Appointments/CertificatePage'; // Import the new certificate page
import DoctorExaminationsDashboard from './Interface/Appointments/DoctorExaminationsDashboard'; // Import Doctor Examinations Dashboard
import CentreExaminationsDashboard from './Interface/Appointments/CentreExaminationsDashboard'; // Import Centre Examinations Dashboard
import PrescribeReportPage from './Interface/Appointments/PrescribeReportPage'; // Import Prescribe Report Page
import ManageReportTemplates from './Interface/Admin/ManageReportTemplates'; // Import Manage Report Templates page
import ExaminationResultPage from './Interface/Appointments/ExaminationResultPage'; // Import Examination Result Page
import UploadDoctorCentreSignaturePage from './Interface/Appointments/UploadDoctorCentreSignaturePage'; // Import Upload Signature Page
 
const onLogout = () => {
  // Clear tokens from localStorage and sessionStorage
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider> {/* Wrap Router with AuthProvider */}
        <Router>
        {/* Wrap Routes with Suspense for i18next loading */}
        <Suspense fallback={<div>Loading translations...</div>}>
        <Routes>
          {/* Public routes with Layout */}
          <Route path="/sign-in" element={<Layout><Login /></Layout>} />
          <Route path="/Logout" element={<Layout><Logout /></Layout>} /> {/* Assuming Logout might need layout */}
          <Route path="/reset-password" element={<Layout><ResetPasswordPage/></Layout>} />
          <Route path="/Registration" element={<Layout><RegistrationForm /></Layout>} />
          <Route path="/confirmation" element={<Layout><ConfirmationPage /></Layout>} />
          <Route path="/resetpassword" element={<Layout><ResetPass /></Layout>} />
          <Route path="/register-doctor-centre" element={<Layout><RegisterDoctorCentreForm /></Layout>} /> {/* Public registration */}

          {/* Root route without Layout */}
          <Route path="/" element={<Template />} />

          {/* Protected routes - Layout applied within ProtectedLayout */}
          <Route path='/dashboard' element={<ProtectedLayout><Layout><Dashboard onLogout={onLogout}/></Layout></ProtectedLayout>} />
          <Route path="/add" element={<ProtectedLayout><Layout><AddForm/></Layout></ProtectedLayout>} />
          <Route path="/bloque" element={<ProtectedLayout><Layout><ComptenotValide/></Layout></ProtectedLayout>}/>
          <Route path="/Tovalidate" element={<ProtectedLayout><Layout><CompteValide onLogout={onLogout} /></Layout></ProtectedLayout>}/>
          <Route path="/UserManagement" element={<ProtectedLayout><Layout><UserManagement onLogout={onLogout} /></Layout></ProtectedLayout>}/>
          <Route path="/users" element={<ProtectedLayout><Layout><UserList /></Layout></ProtectedLayout>} />
          <Route path="/edit-user/:id" element={<ProtectedLayout><Layout><EditUserForm /></Layout></ProtectedLayout>}/>
          {/* Route for editing a DoctorCentreDexamen, protected for Admin */}
          <Route path="/edit-doctor-centre/:id" element={
            <ProtectedLayout requiredRole={["ROLE_ADMIN", "ROLE_DOCTOR_CENTRE_EXAMEN"]}> {/* Corrected role string */}
              <Layout><EditDoctorCentreForm /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/add-cabinet" element={
            <ProtectedLayout>
              <Layout><AddCabinetForm /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/manage-cabinets" element={
            <ProtectedLayout>
              <Layout><CabinetList /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/edit-cabinet/:id" element={
            <ProtectedLayout>
              <Layout><EditCabinetForm /></Layout>
             </ProtectedLayout>
           } />
          <Route path="/change-password" element={
            <ProtectedLayout>
              <Layout><ChangePassword /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/manage-centres" element={
            <ProtectedLayout>
              <Layout><CentreDexamenList /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/add-centre" element={
            <ProtectedLayout>
              <Layout><AddCentreDexamenForm /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/edit-centre/:id" element={
            <ProtectedLayout>
              <Layout><EditCentreDexamenForm /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/activation" element={
            <ProtectedLayout requiredRole="ROLE_ADMIN">
              <Layout><Activation /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/consultation/:appointmentId" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <Layout><ConsultationPage /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/consultation/details/:consultationId" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <Layout><ConsultationPage /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/consultation/exam/new" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <Layout><MedicalExaminationForm /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/consultation/all" element={
            <ProtectedLayout requiredRole={["ROLE_DOCTOR", "ROLE_ASSISTANT"]}>
              <Layout><ConsultationDashboard /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/ordonnance/edit" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <Layout><OrdonnanceEditPage /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/my-consultations" element={
            <ProtectedLayout requiredRole="ROLE_PATIENT">
              <Layout><MyConsultationsPage /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/my-examinations" element={
            <ProtectedLayout requiredRole="ROLE_PATIENT">
              <Layout><MyExaminationsPage /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/add-appointment" element={
            <ProtectedLayout requiredRole={["ROLE_DOCTOR", "ROLE_ASSISTANT", "ROLE_PATIENT"]}>
              <Layout><AddAppointmentForm /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/my-appointments" element={
            <ProtectedLayout requiredRole="ROLE_PATIENT">
              <Layout><MyAppointments /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/manage-appointments" element={
            <ProtectedLayout requiredRole={["ROLE_DOCTOR", "ROLE_ASSISTANT"]}>
              <Layout><ManageAppointments /></Layout>
            </ProtectedLayout>
          } />
          <Route path="/parametres-cabinet" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <Layout><CabinetSettingsPage /></Layout>
            </ProtectedLayout>
          } />
         {/* Route for the new Certificate Page (receives data via state) */}
         <Route path="/generate-certificate" element={
           <ProtectedLayout requiredRole="ROLE_DOCTOR">
             <Layout><CertificatePage /></Layout>
           </ProtectedLayout>
         } />
         {/* Route for the Doctor Examinations Dashboard */}
         <Route path="/doctor-examinations" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <Layout><DoctorExaminationsDashboard /></Layout>
            </ProtectedLayout>
          } />
         {/* Route for the Centre Examinations Dashboard */}
         <Route path="/centre-examinations" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR_CENTRE_EXAMEN">
              <Layout><CentreExaminationsDashboard /></Layout>
            </ProtectedLayout>
          } />
         {/* Route for the Prescribe Report Page */}
         <Route path="/centre/examination/:examId/prescribe-report" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR_CENTRE_EXAMEN">
              <Layout><PrescribeReportPage /></Layout>
            </ProtectedLayout>
          } />
          {/* Route for Admin to manage report templates */}
          <Route path="/admin/manage-report-templates" element={
            <ProtectedLayout requiredRole="ROLE_ADMIN">
              <Layout><ManageReportTemplates /></Layout>
            </ProtectedLayout>
          } />
          {/* Route for the Examination Result Page */}
          <Route path="/examination-result/:examinationId" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR"> {/* Or potentially other roles like PATIENT if they can see this too */}
              <Layout><ExaminationResultPage /></Layout>
            </ProtectedLayout>
          } />
          {/* Route for Doctor Centre to upload signature */}
          <Route path="/upload-doctor-centre-signature" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR_CENTRE_EXAMEN">
              <Layout><UploadDoctorCentreSignaturePage /></Layout>
            </ProtectedLayout>
          } />

           </Routes>
        </Suspense>
        </Router>
      </AuthProvider> {/* Close AuthProvider */}
    </ThemeProvider>
  );
}

export default App;
