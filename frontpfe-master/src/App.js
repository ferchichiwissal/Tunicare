import React, { Suspense } from 'react'; // Import Suspense
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
          <Route path="/sign-in" element={<Login />} />
          <Route path="/Logout" element={<Logout />} />

          <Route path="/" element={<Template />} />
          <Route path="/reset-password" element={<ResetPasswordPage/>} />


          <Route path="/Registration" element={<RegistrationForm />} />

          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/resetpassword" element={<ResetPass />} />
          <Route path='/dashboard' element={<Dashboard onLogout={onLogout}/>} />
          <Route path="/add" element={<AddForm/>} />
          <Route path="/bloque" element={<ComptenotValide/>}/>
          <Route path="/Tovalidate" element={<CompteValide onLogout={onLogout} />}/>
          <Route path="/UserManagement" element={<UserManagement onLogout={onLogout} />}/>

          <Route path="/users" element={<UserList />} />
          <Route path="/edit-user/:id" element={<EditUserForm />}/>
          {/* Route for editing a DoctorCentreDexamen, protected for Admin */}
          <Route path="/edit-doctor-centre/:id" element={
            <ProtectedLayout requiredRole={["ROLE_ADMIN", "ROLE_DOCTOR_CENTRE_EXAMEN"]}> {/* Corrected role string */}
              <EditDoctorCentreForm />
            </ProtectedLayout>
          } />

          {/* Route for adding a cabinet, protected */}
          <Route path="/add-cabinet" element={
            <ProtectedLayout>
              <AddCabinetForm />
            </ProtectedLayout>
          } />

          {/* Route for managing cabinets, protected */}
          <Route path="/manage-cabinets" element={
            <ProtectedLayout>
              <CabinetList />
            </ProtectedLayout>
          } />

          {/* Route for editing a cabinet, protected */}
          <Route path="/edit-cabinet/:id" element={
            <ProtectedLayout>
              <EditCabinetForm />
             </ProtectedLayout>
           } />

          {/* Route for changing password, protected */}
          <Route path="/change-password" element={
            <ProtectedLayout>
              <ChangePassword />
            </ProtectedLayout>
          } />

          {/* --- Centre d'examen Routes --- */}
          {/* Public registration route */}
          <Route path="/register-doctor-centre" element={<RegisterDoctorCentreForm />} />

          {/* Protected routes for managing centres */}
          <Route path="/manage-centres" element={
            <ProtectedLayout>
              <CentreDexamenList />
            </ProtectedLayout>
          } />
          <Route path="/add-centre" element={
            <ProtectedLayout>
              <AddCentreDexamenForm />
            </ProtectedLayout>
          } />
          <Route path="/edit-centre/:id" element={
            <ProtectedLayout>
              <EditCentreDexamenForm />
            </ProtectedLayout>
          } />
          {/* --- End Centre d'examen Routes --- */}

          {/* Route for Doctor Activation Management, protected for Admin */}
          <Route path="/activation" element={
            <ProtectedLayout requiredRole="ROLE_ADMIN">
              <Activation />
            </ProtectedLayout>
          } />

          {/* Route for Consultation Page, protected for Doctor */}
          {/* Renamed param to match component */}
          <Route path="/consultation/:appointmentId" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <ConsultationPage />
            </ProtectedLayout>
          } />

          {/* Route for Medical Examination Form, protected for Doctor */}
          <Route path="/consultation/exam/new" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <MedicalExaminationForm />
            </ProtectedLayout>
          } />

          {/* Route for Consultation Dashboard, protected for Doctor/Assistant */}
          <Route path="/consultation/all" element={
            <ProtectedLayout requiredRole={["ROLE_DOCTOR", "ROLE_ASSISTANT"]}>
              <ConsultationDashboard />
            </ProtectedLayout>
          } />

          {/* Route for Prescription Edit Page, protected for Doctor */}
          <Route path="/ordonnance/edit" element={
            <ProtectedLayout requiredRole="ROLE_DOCTOR">
              <OrdonnanceEditPage />
            </ProtectedLayout>
          } />

          {/* Route for Patient's Consultations Page */}
          <Route path="/my-consultations" element={
            <ProtectedLayout requiredRole="ROLE_PATIENT">
              <MyConsultationsPage />
            </ProtectedLayout>
          } />

          {/* Route for Patient's Examinations Page */}
          <Route path="/my-examinations" element={
            <ProtectedLayout requiredRole="ROLE_PATIENT">
              <MyExaminationsPage />
            </ProtectedLayout>
          } />

          {/* Route for Adding Appointment, protected for Doctor/Assistant */}
          <Route path="/add-appointment" element={
            <ProtectedLayout requiredRole={["ROLE_DOCTOR", "ROLE_ASSISTANT", "ROLE_PATIENT"]}>
              <AddAppointmentForm />
            </ProtectedLayout>
          } />

          {/* Route for Patient's Appointments Page */}
          <Route path="/my-appointments" element={
            <ProtectedLayout requiredRole="ROLE_PATIENT">
              <MyAppointments />
            </ProtectedLayout>
          } />

          {/* Route for Staff Appointment Management */}
          <Route path="/manage-appointments" element={
            <ProtectedLayout requiredRole={["ROLE_DOCTOR", "ROLE_ASSISTANT"]}>
              <ManageAppointments />
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
