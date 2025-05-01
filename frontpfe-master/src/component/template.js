import React, { useContext } from "react"; // Import useContext
import { useTranslation } from "react-i18next";
import ThemeContext from "../utils/ThemeContext"; // Import ThemeContext

const Template = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useContext(ThemeContext); // Get theme and toggle function

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("preferredLanguage", lng); // Sauvegarder la langue choisie
  };

  return (
    <div className="hero_area">
      <div className="hero_area">
        <header className="header_section">
          <div className="header_top">
            <div className="container">
              <div className="contact_nav">
                <a href="">
                  <i className="fa fa-phone" aria-hidden="true"></i>
                  <span>{t("call")}</span>
                </a>
                <a href="">
                  <i className="fa fa-envelope" aria-hidden="true"></i>
                  <span>{t("email")}</span>
                </a>
                <a href="">
                  <i className="fa fa-map-marker" aria-hidden="true"></i>
                  <span>{t("location")}</span>
                </a>
              </div>
            </div>
          </div>
          <div className="header_bottom">
            <div className="container-fluid">
              <nav className="navbar navbar-expand-lg custom_nav-container ">
                <a className="navbar-brand" href="index.html">
                  <img src="images/logo.png" alt="" />
                </a>

                <button
                  className="navbar-toggler"
                  type="button"
                  data-toggle="collapse"
                  data-target="#navbarSupportedContent"
                  aria-controls="navbarSupportedContent"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <span className=""> </span>
                </button>

                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                  <div className="d-flex mr-auto flex-column flex-lg-row align-items-center">
                    <ul className="navbar-nav">
                      <li className="nav-item active">
                        <a className="nav-link" href="">
                          {t("welcome")} <span className="sr-only">(current)</span>
                        </a>
                      </li>
                      {/* Ajoutez d'autres liens ici */}
                    </ul>
                  </div>
                  <div className="quote_btn-container">
                    {/* Dropdown pour la sélection de langue */}
                    <select
                      onChange={(e) => changeLanguage(e.target.value)}
                      value={i18n.language}
                      style={{ padding: "5px", borderRadius: "5px" }}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                     </select>
                     {/* Theme Toggle Button */}
                     <button
                       onClick={toggleTheme}
                       className="btn btn-outline-secondary ml-2" // Added margin-left
                       style={{ padding: "5px 10px", borderRadius: "5px" }}
                       aria-label="Toggle theme"
                     >
                       {theme === 'light' ? (
                         <i className="fa fa-moon-o" aria-hidden="true"></i> // Moon icon for dark mode
                       ) : (
                         <i className="fa fa-sun-o" aria-hidden="true"></i> // Sun icon for light mode
                       )}
                     </button>
                     <a>
                      <i></i>
                      <span>{}</span>
                    </a>
                    <a href="/sign-in">
                      <i className="fa fa-user" aria-hidden="true"></i>
                      <span>{t("login")}</span>
                    </a>

                  
                    <form className="form-inline">
                      <button className="btn  my-2 my-sm-0 nav_search-btn" type="submit">
                        <i className="fa fa-search" aria-hidden="true"></i>
                      </button>
                    </form>
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </header>

        
    <section className="slider_section ">
      <div className="dot_design">
        <img src="images/dots.png" alt=""/>
      </div>
      <div id="customCarousel1" className="carousel slide" data-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <div className="container ">
              <div className="row">
                <div className="col-md-6">
                  <div className="detail-box">
                    <div className="play_btn">
                      <button>
                        <i className="fa fa-play" aria-hidden="true"></i>
                      </button>
                    </div>
                    <h1>
                      {t('home.slider.title')} <br></br>
                      <span>
                        {t('home.slider.subtitle')}
                      </span>
                    </h1>
                    <p>
                      {t('home.slider.description')}
                    </p>
                    <a href="">
                      {t('home.slider.contactButton')}
                    </a>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="img-box">
                    <img src="images/slider-img.jpg" alt=""/>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="carousel-item">
            <div className="container ">
              <div className="row">
                <div className="col-md-6">
                  <div className="detail-box">
                    <div className="play_btn">
                      <button>
                        <i className="fa fa-play" aria-hidden="true"></i>
                      </button>
                    </div>
                    {/* Repeat the same content for other carousel items or customize */}
                    <h1>
                      {t('home.slider.title')} <br></br>
                      <span>
                        {t('home.slider.subtitle')}
                      </span>
                    </h1>
                    <p>
                      {t('home.slider.description')}
                    </p>
                    <a href="">
                      {t('home.slider.contactButton')}
                    </a>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="img-box">
                    <img src="images/slider-img.jpg" alt=""/>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="carousel-item">
            <div className="container ">
              <div className="row">
                <div className="col-md-6">
                  <div className="detail-box">
                    <div className="play_btn">
                      <button>
                        <i className="fa fa-play" aria-hidden="true"></i>
                      </button>
                    </div>
                    {/* Repeat the same content for other carousel items or customize */}
                     <h1>
                      {t('home.slider.title')} <br></br>
                      <span>
                        {t('home.slider.subtitle')}
                      </span>
                    </h1>
                    <p>
                      {t('home.slider.description')}
                    </p>
                    <a href="">
                      {t('home.slider.contactButton')}
                    </a>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="img-box">
                    <img src="images/slider-img.jpg" alt=""/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="carousel_btn-box">
          <a className="carousel-control-prev" href="#customCarousel1" role="button" data-slide="prev">
            <img src="images/prev.png" alt=""/>
            <span className="sr-only">{t('previous')}</span>
          </a>
          <a className="carousel-control-next" href="#customCarousel1" role="button" data-slide="next">
            <img src="images/next.png" alt=""/>
            <span className="sr-only">{t('next')}</span>
          </a>
        </div>
      </div>

    </section>
   </div>


 
  <section className="book_section layout_padding">
    <div className="container">
      <div className="row">
        <div className="col">
          <form>
            <h4>
              {t('home.bookAppointment.title')} <span>{t('home.bookAppointment.titleHighlight')}</span>
            </h4>
            <div className="form-row ">
              <div className="form-group col-lg-4">
                <label htmlFor="inputPatientName">{t('patientName')}</label>
                <input type="text" className="form-control" id="inputPatientName" placeholder={t('fullName')} readOnly />
              </div>
              <div className="form-group col-lg-4">
                <label htmlFor="inputDoctorName">{t('doctorsName')}</label>
                <select name="" className="form-control wide" id="inputDoctorName" disabled>
                  <option value="">{t('home.bookAppointment.doctorPlaceholder')}</option>
                  {/* Add actual doctor options dynamically later */}
                </select>
              </div>
              <div className="form-group col-lg-4">
                <label htmlFor="inputDepartmentName">{t('departmentName')}</label>
                <select name="" className="form-control wide" id="inputDepartmentName" disabled>
                  <option value="">{t('home.bookAppointment.departmentPlaceholder')}</option>
                   {/* Add actual department options dynamically later */}
                </select>
              </div>
            </div>
            <div className="form-row ">
              <div className="form-group col-lg-4">
                <label htmlFor="inputPhone">{t('phoneNumber')}</label>
                <input type="number" className="form-control" id="inputPhone" placeholder={t('home.bookAppointment.phonePlaceholder')} readOnly/>
              </div>
              <div className="form-group col-lg-4">
                <label htmlFor="inputSymptoms">{t('symptoms')}</label>
                <input type="text" className="form-control" id="inputSymptoms" placeholder={t('home.bookAppointment.symptomsPlaceholder')} readOnly/>
              </div>
              <div className="form-group col-lg-4">
                <label htmlFor="inputDate">{t('chooseDate')}</label>
                <div className="input-group date" id="inputDate" data-date-format="mm-dd-yyyy">
                  <input type="text" className="form-control" readOnly/>
                  <span className="input-group-addon date_icon">
                    <i className="fa fa-calendar" aria-hidden="true"></i>
                  </span>
                </div>
              </div>
            </div>
            <div className="btn-box">
              <button type="submit" className="btn ">{t('submitNow')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>


 

  <section className="about_section">
    <div className="container  ">
      <div className="row">
         <div className="col-md-6 ">
           <div className="img-box">
             <img src="images/about-img.jpg" alt=""/>
           </div>
         </div>
        <div className="col-md-6">
          <div className="detail-box">
            <div className="heading_container">
              <h2>
                {t('home.about.title')} <span>{t('home.about.subtitle')}</span>
              </h2>
            </div>
            <p>
              {t('home.about.description')}
            </p>
            <a href="">
              {t('home.about.readMoreButton')}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

   

  <section className="treatment_section layout_padding">
    <div className="side_img">
      <img src="images/treatment-side-img.jpg" alt=""/>
    </div>
    <div className="container">
      <div className="heading_container heading_center">
        <h2>
          {t('home.features.title')} <span>{t('home.features.subtitle')}</span>
        </h2>
      </div>
      <div className="row">
        <div className="col-md-6 col-lg-3">
          <div className="box ">
            <div className="img-box">
              <img src="images/t1.png" alt=""/>
            </div>
            <div className="detail-box">
              <h4>
                {t('home.features.appointments.title')}
              </h4>
              <p>
                {t('home.features.appointments.description')}
              </p>
              <a href="">
                {t('home.features.readMoreButton')}
              </a>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="box ">
            <div className="img-box">
              <img src="images/t2.png" alt=""/>
            </div>
            <div className="detail-box">
              <h4>
                {t('home.features.consultations.title')}
              </h4>
              <p>
                {t('home.features.consultations.description')}
              </p>
              <a href="">
                {t('home.features.readMoreButton')}
              </a>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="box ">
            <div className="img-box">
              <img src="images/t3.png" alt=""/>
            </div>
            <div className="detail-box">
              <h4>
                {t('home.features.exams.title')}
              </h4>
              <p>
                {t('home.features.exams.description')}
              </p>
              <a href="">
                {t('home.features.readMoreButton')}
              </a>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="box ">
            {/* Removed img-box again for alignment */}
            <div className="detail-box">
              <img src="/images/t4.png" alt={t('home.features.reports.title')} style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }} />
              <h4>
                {t('home.features.reports.title')}
              </h4>
              <p>
                {t('home.features.reports.description')}
              </p>
              <a href="">
                {t('home.features.readMoreButton')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

   
  <section className="team_section layout_padding">
    <div className="container">
      <div className="heading_container heading_center">
        {/* Removed span for uniform color */}
        <h2>
          {t('home.doctors.title')} {t('home.doctors.titleHighlight')}
        </h2>
      </div>
      <div className="carousel-wrap ">
        <div className="owl-carousel team_carousel">
          <div className="item">
            <div className="box">
              <div className="img-box">
                <img src="images/team1.jpg" alt="" />
              </div>
              <div className="detail-box">
                <h5>
                  {t('home.doctors.doctor1.name')}
                </h5>
                <h6>
                  {t('home.doctors.doctor1.specialty')}
                </h6>
                <div className="social_box">
                  <a href="">
                    <i className="fa fa-facebook" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-twitter" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-linkedin" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-instagram" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="item">
            <div className="box">
              <div className="img-box">
                <img src="images/team2.jpg" alt="" />
              </div>
              <div className="detail-box">
                <h5>
                  {t('home.doctors.doctor2.name')}
                </h5>
                <h6>
                  {t('home.doctors.doctor2.specialty')}
                </h6>
                <div className="social_box">
                  <a href="">
                    <i className="fa fa-facebook" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-twitter" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-linkedin" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-instagram" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="item">
            <div className="box">
              <div className="img-box">
                <img src="images/team3.jpg" alt="" />
              </div>
              <div className="detail-box">
                <h5>
                  {t('home.doctors.doctor3.name')}
                </h5>
                <h6>
                  {t('home.doctors.doctor3.specialty')}
                </h6>
                <div className="social_box">
                  <a href="">
                    <i className="fa fa-facebook" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-twitter" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-linkedin" aria-hidden="true"></i>
                  </a>
                  <a href="">
                    <i className="fa fa-instagram" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

 

   <section className="client_section layout_padding">
    <div className="container">
      <div className="heading_container">
        <h2>
          {t('testimonialTitle')} <span>{t('testimonialTitleHighlight')}</span>
        </h2>
      </div>
    </div>
    <div className="container px-0">
      <div id="customCarousel2" className="carousel  carousel-fade" data-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <div className="box">
              <div className="client_info">
                <div className="client_name">
                  <h5>
                    {t('testimonial1Author')}
                  </h5>
                  <h6>
                    {t('testimonial1Location')}
                  </h6>
                </div>
                <i className="fa fa-quote-left" aria-hidden="true"></i>
              </div>
              <p>
                {t('testimonial1Text')}
              </p>
            </div>
          </div>
          <div className="carousel-item">
            <div className="box">
              <div className="client_info">
                <div className="client_name">
                  <h5>
                    {t('testimonial2Author')}
                  </h5>
                  <h6>
                    {t('testimonial2Location')}
                  </h6>
                </div>
                <i className="fa fa-quote-left" aria-hidden="true"></i>
              </div>
              <p>
                {t('testimonial2Text')}
              </p>
            </div>
          </div>
          <div className="carousel-item">
            <div className="box">
              <div className="client_info">
                <div className="client_name">
                  <h5>
                    {t('testimonial3Author')}
                  </h5>
                  <h6>
                    {t('testimonial3Location')}
                  </h6>
                </div>
                <i className="fa fa-quote-left" aria-hidden="true"></i>
              </div>
              <p>
                {t('testimonial3Text')}
              </p>
            </div>
          </div>
        </div>
        <div className="carousel_btn-box">
          <a className="carousel-control-prev" href="#customCarousel2" role="button" data-slide="prev">
            <i className="fa fa-angle-left" aria-hidden="true"></i>
            <span className="sr-only">{t('previous')}</span>
          </a>
          <a className="carousel-control-next" href="#customCarousel2" role="button" data-slide="next">
            <i className="fa fa-angle-right" aria-hidden="true"></i>
            <span className="sr-only">{t('next')}</span>
          </a>
        </div>
      </div>
    </div>
  </section>
 
   <section className="contact_section layout_padding-bottom">
    <div className="container">
      <div className="heading_container">
        <h2>
          {t('contactTitle')} <span>{t('contactTitleHighlight')}</span>
        </h2>
      </div>
      <div className="row">
        <div className="col-md-7">
          <div className="form_container">
            <form action="">
              <div>
                <input type="text" placeholder={t('contactNamePlaceholder')} readOnly />
              </div>
              <div>
                <input type="email" placeholder={t('contactEmailPlaceholder')} readOnly />
              </div>
              <div>
                <input type="text" placeholder={t('contactPhonePlaceholder')} readOnly />
              </div>
              <div>
                <input type="text" className="message-box" placeholder={t('contactMessagePlaceholder')} readOnly />
              </div>
              <div className="btn_box">
                <button>
                  {t('send')}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="col-md-5">
          <div className="img-box">
            <img src="images/contact-img.jpg" alt=""/>
          </div>
        </div>
      </div>
    </div>
  </section>
 
   <section className="info_section ">
    <div className="container">
      <div className="info_top">
        <div className="info_logo">
          <a href="">
            <img src="images/logo.png" alt=""/>
          </a>
        </div>
        <div className="info_form">
          <form action="">
            <input type="email" placeholder={t('footer.subscribePlaceholder')}/>
            <button>
              {t('footer.subscribeButton')}
            </button>
          </form>
        </div>
      </div>
      <div className="info_bottom layout_padding2">
        <div className="row info_main_row">
          <div className="col-md-6 col-lg-3">
            <h5>
              {t('footer.addressTitle')}
            </h5>
            <div className="info_contact">
              <a href="">
                <i className="fa fa-map-marker" aria-hidden="true"></i>
                <span>
                  {t('footer.addressLine1')}
                </span>
              </a>
              <a href="">
                <i className="fa fa-phone" aria-hidden="true"></i>
                <span>
                  {t('footer.phone')}
                </span>
              </a>
              <a href="">
                <i className="fa fa-envelope"></i>
                <span>
                  {t('footer.email')}
                </span>
              </a>
            </div>
            <div className="social_box">
              <a href="">
                <i className="fa fa-facebook" aria-hidden="true"></i>
              </a>
              <a href="">
                <i className="fa fa-twitter" aria-hidden="true"></i>
              </a>
              <a href="">
                <i className="fa fa-linkedin" aria-hidden="true"></i>
              </a>
              <a href="">
                <i className="fa fa-instagram" aria-hidden="true"></i>
              </a>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="info_links">
              <h5>
                {t('footer.linksTitle')}
              </h5>
              <div className="info_links_menu">
                <a className="active" href="#">
                  {t('footer.homeLink')}
                </a>
                <a href="#">
                  {t('footer.aboutLink')}
                </a>
                <a href="#">
                  {t('footer.servicesLink')}
                </a>
                {/* <a href="#">{t('footer.whyUsLink')}</a> */}
                {/* <a href="#">{t('footer.teamLink')}</a> */}
                <a href="#">
                  {t('contactUs')}
                </a>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="info_post">
              <h5>
                {t('footer.postsTitle')}
              </h5>
              <div className="post_box">
                <div className="img-box">
                  <img src="images/post1.jpg" alt=""/>
                </div>
                <p>
                  {t('footer.post1Title')} <br/>
                  <small>{t('footer.post1Author')} - {t('footer.post1Date')}</small>
                </p>
              </div>
              <div className="post_box">
                <div className="img-box">
                  <img src="images/post2.jpg" alt=""/>
                </div>
                <p>
                  {t('footer.post2Title')} <br/>
                  <small>{t('footer.post2Author')} - {t('footer.post2Date')}</small>
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="info_post">
              <h5>
                {t('footer.newsTitle')}
              </h5>
              <div className="post_box">
                <div className="img-box">
                  <img src="images/post3.jpg" alt=""/>
                </div>
                <p>
                  {t('footer.post3Title')} <br/>
                  <small>{t('footer.post3Author')} - {t('footer.post3Date')}</small>
                </p>
              </div>
              <div className="post_box">
                <div className="img-box">
                  <img src="images/post4.png" alt=""/>
                </div>
                <p>
                  {t('footer.newsText')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
 

   <footer className="footer_section">
    <div className="container">
      <p>
        &copy; <span id="displayYear">{new Date().getFullYear()}</span> {t('footer.copyright')}
        <a href="#"> {t('footer.copyrightLinkText')}</a>
      </p>
    </div>
  </footer>
 







  
 </div>
 
  );
};

export default Template;
