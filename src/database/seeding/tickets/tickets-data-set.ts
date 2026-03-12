import { TicketStatus } from "../../../enums/TicketStatus.enum.js";

export const ticketTemplates = [
  // Software Issues
  {
    title: "Unable to login to email account",
    description:
      "I've been trying to access my email account since this morning but keep getting 'Invalid credentials' error. I've tried resetting my password twice but still can't login. This is urgent as I need to access important client emails.",
    specializationName: "Technical support",
    problemName: "Password and account access",
    priority: "HIGH",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Microsoft Office activation error",
    description:
      "Getting activation error when trying to open Word and Excel. Error message says 'Product activation failed'. I need to complete a report by end of day.",
    specializationName: "Technical support",
    problemName: "Software installation issues",
    priority: "MEDIUM",
    status: TicketStatus.OPEN,
  },
  {
    title: "Antivirus blocking work application",
    description:
      "The antivirus software is blocking our project management tool. I get a security warning every time I try to launch it. Can you whitelist this application?",
    specializationName: "Technical support",
    problemName: "Software installation issues",
    priority: "MEDIUM",
    status: TicketStatus.RESOLVED,
  },
  {
    title: "VPN connection keeps dropping",
    description:
      "My VPN connection disconnects every 10-15 minutes when working from home. This is affecting my productivity as I lose access to network drives and internal systems.",
    specializationName: "Technical support",
    problemName: "Network connectivity problems",
    priority: "HIGH",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Slow application performance",
    description:
      "The CRM application has been extremely slow for the past week. It takes 2-3 minutes to load customer records. Other applications work fine.",
    specializationName: "Technical support",
    problemName: "System crashes and errors",
    priority: "MEDIUM",
    status: TicketStatus.PENDING,
  },

  // Network Issues
  {
    title: "No internet connection in conference room",
    description:
      "The WiFi in Conference Room B is not working. We have an important client meeting in 2 hours and need internet access for the presentation.",
    specializationName: "Technical support",
    problemName: "Network connectivity problems",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Cannot access shared network drive",
    description:
      "I'm unable to access the \\\\server\\shared drive. Getting 'Network path not found' error. I need to retrieve files for today's meeting.",
    specializationName: "Technical support",
    problemName: "Network connectivity problems",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Intermittent network disconnections",
    description:
      "My computer keeps losing network connection randomly throughout the day. It reconnects after a minute but disrupts my work. This has been happening for 3 days.",
    specializationName: "Technical support",
    problemName: "Network connectivity problems",
    priority: "MEDIUM",
    status: TicketStatus.RESOLVED,
  },
  {
    title: "Slow file transfer speeds",
    description:
      "Transferring files to the network drive is extremely slow. A 50MB file takes 10+ minutes to upload. This is affecting project deadlines.",
    specializationName: "Technical support",
    problemName: "System crashes and errors",
    priority: "MEDIUM",
    status: TicketStatus.CLOSED,
  },
  {
    title: "Cannot connect to printer via network",
    description:
      "The network printer in our department is not showing up in my available printers list. I've tried restarting my computer but still can't find it.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Printer and peripheral issues",
    priority: "LOW",
    status: TicketStatus.OPEN,
  },

  // Hardware Issues
  {
    title: "Laptop screen flickering",
    description:
      "My laptop screen has been flickering constantly for the past 2 days. It's making it difficult to work and causing eye strain. The flickering gets worse when the laptop heats up.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "HIGH",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Keyboard keys not working",
    description:
      "Several keys on my keyboard (E, R, T, and spacebar) are not responding. I'm using the on-screen keyboard as a workaround but need this fixed urgently.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Keyboard malfunction",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Printer paper jam",
    description:
      "The department printer has a paper jam that I can't clear. I've tried following the manual but the paper is stuck deep inside. We have urgent documents to print.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Printer and peripheral issues",
    priority: "MEDIUM",
    status: TicketStatus.RESOLVED,
  },
  {
    title: "Computer won't turn on",
    description:
      "My desktop computer won't power on at all. No lights, no sounds, nothing. I've checked the power cable and outlet - both are working. Need urgent help as I have deadlines today.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "External monitor not detected",
    description:
      "My laptop is not detecting the external monitor. I've tried different cables and ports but nothing works. The monitor works fine with other laptops.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "MEDIUM",
    status: TicketStatus.PENDING,
  },
  {
    title: "Mouse cursor jumping randomly",
    description:
      "The mouse cursor jumps around the screen randomly, making it impossible to click accurately. I've tried cleaning the mouse and changing the surface but issue persists.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Mouse not working",
    priority: "LOW",
    status: TicketStatus.OPEN,
  },
  {
    title: "Laptop battery not charging",
    description:
      "My laptop battery shows 'plugged in, not charging'. Battery is at 45% and won't charge further. The laptop is only 6 months old.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "MEDIUM",
    status: TicketStatus.RESOLVED,
  },
  {
    title: "Printer printing blank pages",
    description:
      "The printer is printing blank pages even though the ink cartridges are full. I've run the cleaning cycle twice but the problem continues.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Printer and peripheral issues",
    priority: "LOW",
    status: TicketStatus.CLOSED,
  },

  // Attendance System Issues
  {
    title: "Fingerprint not recognized at attendance device",
    description:
      "The fingerprint scanner is not recognizing my fingerprint for the past 3 days. I've been manually signing in but need this fixed. My attendance records are incorrect.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Fingerprint not working in attendance system",
    priority: "MEDIUM",
    status: TicketStatus.OPEN,
  },
  {
    title: "Attendance system showing wrong clock-in time",
    description:
      "The attendance system recorded my clock-in time as 9:30 AM but I actually clocked in at 8:00 AM. I have witnesses who can confirm. Please correct my attendance record.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Attendance system synchronization",
    priority: "LOW",
    status: TicketStatus.PENDING,
  },
  {
    title: "Cannot access attendance portal",
    description:
      "I'm unable to login to the attendance portal to view my records. Getting 'Access Denied' error. I need to check my leave balance and attendance history.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "User access and permissions",
    priority: "LOW",
    status: TicketStatus.RESOLVED,
  },
  {
    title: "Fingerprint device offline",
    description:
      "The fingerprint attendance device at the main entrance is showing 'Device Offline' message. Multiple employees are unable to clock in. This is urgent!",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Fingerprint not working in attendance system",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Missing attendance records",
    description:
      "My attendance records for the past week are missing from the system. I clocked in and out every day but the system shows no records. Need this investigated urgently.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Attendance system synchronization",
    priority: "HIGH",
    status: TicketStatus.IN_PROGRESS,
  },

  // ERP System Issues
  {
    title: "ERP system login timeout",
    description:
      "The ERP system keeps timing out when I try to login. I need to process payroll today and can't access the system. This is affecting the entire HR department.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "User access and permissions",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Cannot generate financial reports in ERP",
    description:
      "The report generation module in the ERP system is not working. I get an error message when trying to generate monthly financial reports. Need this fixed before the board meeting.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Report generation failures",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },

  // General IT Requests
  {
    title: "Request for new software installation",
    description:
      "I need Adobe Photoshop installed on my computer for design work. My manager has approved this request. Please let me know what information you need.",
    specializationName: "Technical support",
    problemName: "Software installation issues",
    priority: "LOW",
    status: TicketStatus.OPEN,
  },
  {
    title: "Need additional monitor for workstation",
    description:
      "I'm working on multiple applications simultaneously and need a second monitor to improve productivity. My manager has approved this request.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Equipment lifecycle management",
    priority: "LOW",
    status: TicketStatus.PENDING,
  },
  {
    title: "Request access to project folder",
    description:
      "I've been assigned to the Marketing Project team and need access to the shared project folder on the network drive. My manager is Sarah Johnson.",
    specializationName: "Technical support",
    problemName: "Password and account access",
    priority: "MEDIUM",
    status: TicketStatus.RESOLVED,
  },

  // Additional Software Issues
  {
    title: "Outlook keeps crashing when opening attachments",
    description:
      "Every time I try to open a PDF attachment in Outlook, the application crashes. This is preventing me from reviewing important documents sent by clients.",
    specializationName: "Technical support",
    problemName: "System crashes and errors",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Cannot install Windows updates",
    description:
      "Windows update keeps failing with error code 0x80070002. The system has been trying to install updates for 3 days now. Need assistance to resolve this.",
    specializationName: "Technical support",
    problemName: "Software installation issues",
    priority: "MEDIUM",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Browser redirecting to wrong pages",
    description:
      "My web browser keeps redirecting to random advertising pages. I suspect malware. Please help scan and clean my system urgently.",
    specializationName: "Technical support",
    problemName: "System crashes and errors",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Shared calendar not syncing",
    description:
      "The department shared calendar is not syncing with my Outlook. I'm missing important meetings and appointments. This started after the last update.",
    specializationName: "Technical support",
    problemName: "Email and communication issues",
    priority: "MEDIUM",
    status: TicketStatus.OPEN,
  },
  {
    title: "File permissions error on shared drive",
    description:
      "I'm getting 'Access Denied' errors when trying to save files to the shared project folder. I had access last week but now it's blocked.",
    specializationName: "Technical support",
    problemName: "Password and account access",
    priority: "HIGH",
    status: TicketStatus.PENDING,
  },

  // Additional Hardware Issues
  {
    title: "Laptop overheating and shutting down",
    description:
      "My laptop gets extremely hot and shuts down automatically after 30 minutes of use. The fan seems to be running constantly but not cooling effectively.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "USB ports not working",
    description:
      "None of the USB ports on my desktop are working. I can't connect my mouse, keyboard, or external drives. Tried restarting but issue persists.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Headset microphone not detected",
    description:
      "My headset microphone is not being detected by the system. I have online meetings today and need this fixed urgently. The speakers work fine.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Scanner not scanning properly",
    description:
      "The department scanner is producing blurry and distorted scans. We need to scan important documents for archiving. Tried cleaning the glass but no improvement.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Printer and peripheral issues",
    priority: "MEDIUM",
    status: TicketStatus.RESOLVED,
  },
  {
    title: "Laptop screen has dead pixels",
    description:
      "My laptop screen has developed several dead pixels in the center. It's distracting and affecting my work. The laptop is still under warranty.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "LOW",
    status: TicketStatus.PENDING,
  },
  {
    title: "Wireless keyboard connection dropping",
    description:
      "My wireless keyboard keeps disconnecting randomly. I've replaced the batteries but the problem continues. Need a replacement or fix.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Keyboard malfunction",
    priority: "MEDIUM",
    status: TicketStatus.OPEN,
  },
  {
    title: "Projector not displaying image",
    description:
      "The conference room projector is not displaying any image. The power light is on but screen remains blank. We have a presentation in 1 hour.",
    specializationName: "Maintenance and decommissioning",
    problemName: "Hardware component failure",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },

  // Additional Network Issues
  {
    title: "WiFi signal weak in office area",
    description:
      "The WiFi signal in the east wing offices is very weak. Connection keeps dropping and speeds are extremely slow. Multiple employees are affected.",
    specializationName: "Technical support",
    problemName: "Network connectivity problems",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Cannot connect to VPN from home",
    description:
      "I'm unable to connect to the company VPN from my home network. Getting 'Connection timeout' error. I need to access internal systems for work.",
    specializationName: "Technical support",
    problemName: "Network connectivity problems",
    priority: "HIGH",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Email server connection issues",
    description:
      "Outlook keeps showing 'Trying to connect' and emails are not sending or receiving. This is affecting the entire department's communication.",
    specializationName: "Technical support",
    problemName: "Email and communication issues",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },

  // Additional ERP Issues
  {
    title: "ERP inventory module showing incorrect stock levels",
    description:
      "The inventory module is displaying wrong stock quantities. Physical count shows 500 units but system shows 200. This is affecting our ordering process.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Data integration problems",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Cannot approve purchase orders in ERP",
    description:
      "The approval workflow in the ERP system is not working. I can't approve pending purchase orders and this is delaying procurement.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Workflow automation failures",
    priority: "HIGH",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "ERP payroll calculation errors",
    description:
      "The payroll module is calculating overtime incorrectly. Several employees have reported discrepancies in their salary calculations.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Module configuration errors",
    priority: "CRITICAL",
    status: TicketStatus.IN_PROGRESS,
  },
  {
    title: "Need new user account in ERP system",
    description:
      "We have a new employee starting next week who needs access to the ERP system. Please create an account with standard employee permissions.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "ERP user account creation",
    priority: "LOW",
    status: TicketStatus.OPEN,
  },
  {
    title: "Attendance device not syncing with server",
    description:
      "The attendance device at the south entrance is not syncing data with the central server. Employee check-ins are not being recorded.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Attendance system synchronization",
    priority: "HIGH",
    status: TicketStatus.OPEN,
  },
  {
    title: "Need to add new employee to fingerprint system",
    description:
      "New employee needs to be registered in the fingerprint attendance system. Please schedule a time to enroll their fingerprint.",
    specializationName: "Enterprise Resource Planning support",
    problemName: "Add user to attendance system",
    priority: "MEDIUM",
    status: TicketStatus.PENDING,
  },
];
