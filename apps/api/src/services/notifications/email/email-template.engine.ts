/**
 * Safely escapes HTML special characters to prevent HTML/XSS injection in emails.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface BaseTemplateData {
  appName?: string;
  appUrl?: string;
  recipientName?: string;
}

export interface DefectAssignedTemplateData extends BaseTemplateData {
  defectKey: string;
  defectTitle: string;
  severity: string;
  priority: string;
  projectName: string;
  assignedByName?: string;
  defectUrl: string;
}

export interface TestRunCompletedTemplateData extends BaseTemplateData {
  runName: string;
  projectName: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  durationMs?: number;
  runUrl: string;
}

export interface CriticalAlertTemplateData extends BaseTemplateData {
  alertTitle: string;
  alertMessage: string;
  projectName?: string;
  severity: string;
  actionUrl: string;
  actionLabel?: string;
}

export interface SecurityAlertTemplateData extends BaseTemplateData {
  eventTitle: string;
  eventDescription: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  actionUrl?: string;
}

export interface InvitationTemplateData extends BaseTemplateData {
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

export interface DigestTemplateData extends BaseTemplateData {
  periodName: string; // e.g. "Weekly Digest"
  summaryDate: string;
  totalExecutions: number;
  passRate: number;
  newDefects: number;
  resolvedDefects: number;
  qualityGatesPassed: number;
  dashboardUrl: string;
}

function wrapBaseLayout(title: string, bodyContent: string, actionButton?: { label: string; url: string }): string {
  const buttonHtml = actionButton
    ? `
    <div style="margin: 28px 0; text-align: center;">
      <a href="${escapeHtml(actionButton.url)}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
        ${escapeHtml(actionButton.label)}
      </a>
    </div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #1f2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 20px 28px; text-align: left;">
              <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                🛡️ AI QA Platform
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px; line-height: 1.6;">
              <h1 style="font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #111827;">
                ${escapeHtml(title)}
              </h1>
              ${bodyContent}
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 28px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p style="margin: 0 0 6px 0;">This email was sent by AI QA Platform.</p>
              <p style="margin: 0;">You can manage your notification preferences in your account settings.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export class EmailTemplateEngine {
  /**
   * Renders defect assigned email (HTML + text).
   */
  static renderDefectAssigned(data: DefectAssignedTemplateData): { html: string; text: string; subject: string } {
    const subject = `[${data.projectName}] Assigned Defect: ${data.defectKey} - ${data.defectTitle}`;
    const bodyContent = `
      <p style="margin-bottom: 16px;">Hello ${escapeHtml(data.recipientName || 'there')},</p>
      <p style="margin-bottom: 20px;">
        You have been assigned to defect <strong>${escapeHtml(data.defectKey)}</strong> in <strong>${escapeHtml(data.projectName)}</strong>${data.assignedByName ? ` by ${escapeHtml(data.assignedByName)}` : ''}.
      </p>
      <div style="background-color: #f9fafb; border-left: 4px solid #ef4444; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #111827;">${escapeHtml(data.defectTitle)}</p>
        <p style="margin: 0; font-size: 13px; color: #4b5563;">
          <strong>Severity:</strong> <span style="color: #b91c1c; font-weight: 600;">${escapeHtml(data.severity)}</span> &nbsp;|&nbsp;
          <strong>Priority:</strong> ${escapeHtml(data.priority)}
        </p>
      </div>`;

    const html = wrapBaseLayout(`Defect Assigned: ${data.defectKey}`, bodyContent, {
      label: 'View Defect in Platform',
      url: data.defectUrl,
    });

    const text = `Hello ${data.recipientName || 'there'},\n\n` +
      `You have been assigned to defect ${data.defectKey}: "${data.defectTitle}" in ${data.projectName}.\n` +
      `Severity: ${data.severity} | Priority: ${data.priority}\n\n` +
      `View defect: ${data.defectUrl}\n\n` +
      `AI QA Platform`;

    return { html, text, subject };
  }

  /**
   * Renders test run completed email.
   */
  static renderTestRunCompleted(data: TestRunCompletedTemplateData): { html: string; text: string; subject: string } {
    const isPassing = data.passRate >= 90;
    const badgeColor = isPassing ? '#10b981' : '#ef4444';
    const subject = `[${data.projectName}] Test Run Completed: ${data.runName} (${data.passRate.toFixed(1)}% Pass Rate)`;

    const bodyContent = `
      <p style="margin-bottom: 16px;">Test execution for <strong>${escapeHtml(data.runName)}</strong> has finished.</p>
      <div style="display: table; width: 100%; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: 700; color: ${badgeColor}; margin-bottom: 10px;">
          ${data.passRate.toFixed(1)}% Passed
        </div>
        <p style="margin: 0; font-size: 14px; color: #374151;">
          <strong>Total:</strong> ${data.totalTests} &nbsp;|&nbsp;
          <strong>Passed:</strong> <span style="color: #10b981; font-weight: 600;">${data.passedCount}</span> &nbsp;|&nbsp;
          <strong>Failed:</strong> <span style="color: #ef4444; font-weight: 600;">${data.failedCount}</span>
        </p>
      </div>`;

    const html = wrapBaseLayout(`Test Run Completed: ${data.runName}`, bodyContent, {
      label: 'Inspect Test Run Results',
      url: data.runUrl,
    });

    const text = `Test execution for "${data.runName}" in ${data.projectName} is completed.\n` +
      `Pass Rate: ${data.passRate.toFixed(1)}%\n` +
      `Total: ${data.totalTests} | Passed: ${data.passedCount} | Failed: ${data.failedCount}\n\n` +
      `Inspect results: ${data.runUrl}\n\n` +
      `AI QA Platform`;

    return { html, text, subject };
  }

  /**
   * Renders critical alert / quality gate failure.
   */
  static renderCriticalAlert(data: CriticalAlertTemplateData): { html: string; text: string; subject: string } {
    const subject = `CRITICAL ALERT: ${data.alertTitle}${data.projectName ? ` [${data.projectName}]` : ''}`;
    const bodyContent = `
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #991b1b; margin-top: 0; margin-bottom: 8px;">
          ⚠️ ${escapeHtml(data.alertTitle)}
        </h2>
        <p style="margin: 0; color: #7f1d1d; font-size: 14px; white-space: pre-wrap;">
          ${escapeHtml(data.alertMessage)}
        </p>
      </div>`;

    const html = wrapBaseLayout(data.alertTitle, bodyContent, {
      label: data.actionLabel || 'Investigate Issue',
      url: data.actionUrl,
    });

    const text = `CRITICAL ALERT: ${data.alertTitle}\n\n` +
      `${data.alertMessage}\n\n` +
      `Investigate: ${data.actionUrl}\n\n` +
      `AI QA Platform`;

    return { html, text, subject };
  }

  /**
   * Renders security alert email.
   */
  static renderSecurityAlert(data: SecurityAlertTemplateData): { html: string; text: string; subject: string } {
    const subject = `Security Notification: ${data.eventTitle}`;
    const bodyContent = `
      <p style="margin-bottom: 16px;">Hello ${escapeHtml(data.recipientName || 'there')},</p>
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400e;">${escapeHtml(data.eventTitle)}</p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #78350f;">${escapeHtml(data.eventDescription)}</p>
        <p style="margin: 0; font-size: 12px; color: #92400e;">
          <strong>Timestamp:</strong> ${escapeHtml(data.timestamp)}<br>
          ${data.ipAddress ? `<strong>IP Address:</strong> ${escapeHtml(data.ipAddress)}<br>` : ''}
          ${data.userAgent ? `<strong>Device:</strong> ${escapeHtml(data.userAgent)}` : ''}
        </p>
      </div>
      <p style="font-size: 13px; color: #6b7280;">If you did not initiate this action, please secure your account immediately.</p>`;

    const html = wrapBaseLayout(data.eventTitle, bodyContent, data.actionUrl ? {
      label: 'Review Account Security',
      url: data.actionUrl,
    } : undefined);

    const text = `Security Notification: ${data.eventTitle}\n\n` +
      `${data.eventDescription}\n\n` +
      `Timestamp: ${data.timestamp}\n` +
      (data.ipAddress ? `IP: ${data.ipAddress}\n` : '') +
      `\nAI QA Platform`;

    return { html, text, subject };
  }

  /**
   * Renders organization invitation email.
   */
  static renderInvitation(data: InvitationTemplateData): { html: string; text: string; subject: string } {
    const subject = `You're invited to join ${data.organizationName} on AI QA Platform`;
    const bodyContent = `
      <p style="margin-bottom: 16px;">Hello,</p>
      <p style="margin-bottom: 20px;">
        <strong>${escapeHtml(data.inviterName)}</strong> has invited you to join <strong>${escapeHtml(data.organizationName)}</strong> on AI QA Platform as a <strong>${escapeHtml(data.role)}</strong>.
      </p>
      <p style="margin-bottom: 24px; font-size: 14px; color: #4b5563;">
        Collaborate with your team on test case management, automated test runs, intelligent defect triage, and quality analytics.
      </p>`;

    const html = wrapBaseLayout(`Invitation to join ${data.organizationName}`, bodyContent, {
      label: 'Accept Invitation & Get Started',
      url: data.inviteUrl,
    });

    const text = `Hello,\n\n` +
      `${data.inviterName} has invited you to join ${data.organizationName} on AI QA Platform as a ${data.role}.\n\n` +
      `Accept invitation: ${data.inviteUrl}\n\n` +
      `AI QA Platform`;

    return { html, text, subject };
  }

  /**
   * Renders weekly / daily digest email.
   */
  static renderDigest(data: DigestTemplateData): { html: string; text: string; subject: string } {
    const subject = `[AI QA Platform] ${data.periodName} - ${data.summaryDate}`;
    const bodyContent = `
      <p style="margin-bottom: 16px;">Here is your summary of quality and testing activities for <strong>${escapeHtml(data.summaryDate)}</strong>.</p>
      <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 24px;">
        <tr>
          <td style="font-size: 14px; color: #4b5563;"><strong>Test Executions:</strong></td>
          <td align="right" style="font-size: 16px; font-weight: 700; color: #111827;">${data.totalExecutions}</td>
        </tr>
        <tr>
          <td style="font-size: 14px; color: #4b5563;"><strong>Overall Pass Rate:</strong></td>
          <td align="right" style="font-size: 16px; font-weight: 700; color: #10b981;">${data.passRate.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="font-size: 14px; color: #4b5563;"><strong>New Defects Logged:</strong></td>
          <td align="right" style="font-size: 16px; font-weight: 700; color: #ef4444;">${data.newDefects}</td>
        </tr>
        <tr>
          <td style="font-size: 14px; color: #4b5563;"><strong>Defects Resolved:</strong></td>
          <td align="right" style="font-size: 16px; font-weight: 700; color: #3b82f6;">${data.resolvedDefects}</td>
        </tr>
        <tr>
          <td style="font-size: 14px; color: #4b5563;"><strong>Quality Gates Passed:</strong></td>
          <td align="right" style="font-size: 16px; font-weight: 700; color: #8b5cf6;">${data.qualityGatesPassed}</td>
        </tr>
      </table>`;

    const html = wrapBaseLayout(data.periodName, bodyContent, {
      label: 'Open Platform Dashboard',
      url: data.dashboardUrl,
    });

    const text = `${data.periodName} - ${data.summaryDate}\n\n` +
      `Test Executions: ${data.totalExecutions}\n` +
      `Pass Rate: ${data.passRate.toFixed(1)}%\n` +
      `New Defects: ${data.newDefects} | Resolved: ${data.resolvedDefects}\n` +
      `Quality Gates Passed: ${data.qualityGatesPassed}\n\n` +
      `Open dashboard: ${data.dashboardUrl}\n\n` +
      `AI QA Platform`;

    return { html, text, subject };
  }
}
