const baseEmailTemplate = (title, content, footerText = '– ISA-India') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A0E17; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: #F97316; margin: 0;">${title}</h2>
      </div>

      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb;">
        ${content}
      </div>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">${footerText}</p>
      </div>
    </div>
  `
}

module.exports = baseEmailTemplate
