/**
 * Mock email service for development
 * This simulates sending emails without actually sending them
 */
class MockEmailService {
  /**
   * Send welcome email to new user
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(email, firstName) {
    console.log(`📧 [MOCK EMAIL] Welcome email sent to: ${email}`);
    console.log(`   Subject: Welcome to DreamNest, ${firstName}!`);
    console.log(`   Content: Thank you for joining DreamNest. Your account is ready to use.`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  /**
   * Send email verification
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {string} verificationToken - Verification token
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmailVerification(email, firstName, verificationToken) {
    console.log(`📧 [MOCK EMAIL] Email verification sent to: ${email}`);
    console.log(`   Subject: Verify your DreamNest account`);
    console.log(`   Verification Token: ${verificationToken}`);
    console.log(`   Verification Link: ${process.env.API_BASE_URL}/api/auth/verify-email?token=${verificationToken}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(email, firstName, resetToken) {
    console.log(`📧 [MOCK EMAIL] Password reset email sent to: ${email}`);
    console.log(`   Subject: Reset your DreamNest password`);
    console.log(`   Reset Token: ${resetToken}`);
    console.log(`   Reset Link: ${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  /**
   * Send booking confirmation email
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {object} bookingDetails - Booking details
   * @returns {Promise<boolean>} - Success status
   */
  async sendBookingConfirmation(email, firstName, bookingDetails) {
    console.log(`📧 [MOCK EMAIL] Booking confirmation sent to: ${email}`);
    console.log(`   Subject: Booking Confirmation - ${bookingDetails.propertyTitle}`);
    console.log(`   Booking ID: ${bookingDetails.id}`);
    console.log(`   Property: ${bookingDetails.propertyTitle}`);
    console.log(`   Check-in: ${bookingDetails.checkInDate}`);
    console.log(`   Check-out: ${bookingDetails.checkOutDate}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  /**
   * Send general email
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail(email, subject, body) {
    console.log(`📧 [MOCK EMAIL] Email sent to: ${email}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

const emailService = new MockEmailService();

module.exports = emailService;