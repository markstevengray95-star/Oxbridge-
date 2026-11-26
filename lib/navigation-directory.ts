export type Area="home"|"tutor"|"interviews"|"tests"|"application"|"progress"|"school"|"admin"|"account"
export type NavigationAccess={signedIn:boolean;staff:boolean;manage:boolean;owner:boolean;admin:boolean}
export type Tool={href:string;label:string;description:string;keywords?:string;area:Area;featured:boolean;access?:"staff"|"manage"|"owner"|"admin"}
export const studentAreas=[{id:"home",label:"Home",href:"/student-home"},{id:"tutor",label:"My Tutor",href:"/tutor"},{id:"interviews",label:"Interviews",href:"/study/interviews"},{id:"tests",label:"Admissions Tests",href:"/study/tests"},{id:"application",label:"My Application",href:"/study/application"},{id:"progress",label:"My Progress",href:"/study/progress"}] as const
export const noAccess:NavigationAccess={signedIn:false,staff:false,manage:false,owner:false,admin:false}
export const tools:Tool[]=[
  {
    "href": "/interviews",
    "label": "Interview Hub",
    "description": "Choose the right interview format",
    "keywords": "interview formal ai live voice panel",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/live-interview",
    "label": "Live voice interview",
    "description": "Realtime voice interview",
    "keywords": "Gemini audio microphone speaking",
    "area": "interviews",
    "featured": true
  },
  {
    "href": "/natural-ai-interview",
    "label": "Natural Voice",
    "description": "Adaptive spoken interview",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/interview-room",
    "label": "Formal Interview",
    "description": "Structured realistic practice",
    "keywords": "formal interview realistic academic",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/panel-interview",
    "label": "Panel Interview",
    "description": "Two academic interviewers",
    "keywords": "two interviewer panel",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/cambridge-interview-day",
    "label": "Cambridge Interview Day",
    "description": "Cambridge-style simulation",
    "keywords": "cambridge college interview day december",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/mock-day",
    "label": "Mock Interview Day",
    "description": "Two interviews and end-of-day review",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/mock-week",
    "label": "Mock Week",
    "description": "Longer no-feedback interview block",
    "keywords": "no feedback interview week",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/interview-feedback",
    "label": "Interview Feedback",
    "description": "Reasoning analysis and re-answer practice",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/elevenlabs-interview",
    "label": "ElevenLabs Voice",
    "description": "Alternative realtime voices",
    "keywords": "elevenlabs natural voice realtime interview microphone gpt 5.6",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/ai-interview",
    "label": "AI Interview",
    "description": "Transcript-based adaptive follow-up",
    "keywords": "ai adaptive interview follow up",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/full-papers",
    "label": "Full Papers",
    "description": "Timed TMUA, ESAT, TARA, LNAT and UCAT mocks",
    "area": "tests",
    "featured": true
  },
  {
    "href": "/advanced-practice",
    "label": "Question Practice",
    "description": "Challenge ladders and question bank",
    "keywords": "test admissions challenge ladder questions",
    "area": "tests",
    "featured": false
  },
  {
    "href": "/adaptive-paper",
    "label": "Adaptive Paper",
    "description": "Weak-area paper generator",
    "keywords": "paper weak areas unseen tmua esat tara lnat ucat",
    "area": "tests",
    "featured": false
  },
  {
    "href": "/paper-intervention",
    "label": "Paper Intervention",
    "description": "Weakness → mini-lesson → retest",
    "area": "tests",
    "featured": true
  },
  {
    "href": "/timing-trainer",
    "label": "Timing Trainer",
    "description": "Pacing, flag and skip decisions",
    "keywords": "time flag skip move on test decision",
    "area": "tests",
    "featured": false
  },
  {
    "href": "/essay-tutor",
    "label": "Essay Tutor",
    "description": "LNAT/TARA argument analysis",
    "keywords": "lnat tara essay writing argument",
    "area": "application",
    "featured": false
  },
  {
    "href": "/question-quality",
    "label": "Question Quality",
    "description": "Question-bank validation",
    "keywords": "validate question bank duplicate options quality",
    "area": "tests",
    "featured": false
  },
  {
    "href": "/application-profile",
    "label": "Application profile",
    "description": "Connect course, reading, projects and written work",
    "area": "application",
    "featured": true
  },
  {
    "href": "/application-defence",
    "label": "Application Defence",
    "description": "Practise questions from your own evidence",
    "area": "application",
    "featured": false
  },
  {
    "href": "/requirements",
    "label": "Requirements & Audit",
    "description": "Course and application requirements",
    "keywords": "course requirement test written work college assessment",
    "area": "application",
    "featured": true
  },
  {
    "href": "/timeline",
    "label": "Timeline",
    "description": "Deadlines and next actions",
    "keywords": "deadline calendar ucas application",
    "area": "application",
    "featured": false
  },
  {
    "href": "/personal-statement-map",
    "label": "Personal statement analysis",
    "description": "Defend every academic claim",
    "keywords": "personal statement defence claims reading motivation",
    "area": "application",
    "featured": true
  },
  {
    "href": "/written-work-vault",
    "label": "Written Work",
    "description": "Written-work defence preparation",
    "keywords": "essay submitted work defence claims",
    "area": "application",
    "featured": false
  },
  {
    "href": "/cambridge-assessments",
    "label": "Cambridge Assessments",
    "description": "College assessment guidance",
    "keywords": "cambridge college assessment architecture linguistics mml",
    "area": "application",
    "featured": false
  },
  {
    "href": "/technology-rehearsal",
    "label": "Technology Rehearsal",
    "description": "Camera, mic and interview setup",
    "keywords": "camera microphone interview tech",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/source-health",
    "label": "Official Source Watcher",
    "description": "Check guidance freshness",
    "keywords": "official source freshness oxford cambridge test provider",
    "area": "application",
    "featured": false
  },
  {
    "href": "/backup-center",
    "label": "Backup Centre",
    "description": "Encrypted profile export/import",
    "keywords": "backup export import move device encrypted",
    "area": "account",
    "featured": false
  },
  {
    "href": "/daily-challenge",
    "label": "Daily Challenge",
    "description": "One course-specific reasoning challenge",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/course-bank",
    "label": "Course Bank",
    "description": "Deep course-specific questions",
    "keywords": "course physics law medicine maths engineering questions",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/reading-room",
    "label": "Reading Room",
    "description": "Academic extracts and tutorial questions",
    "keywords": "unseen extract annotate tutorial",
    "area": "application",
    "featured": false
  },
  {
    "href": "/supercurricular-coach",
    "label": "Supercurricular Coach",
    "description": "Turn reading and projects into interview reasoning",
    "area": "application",
    "featured": true
  },
  {
    "href": "/knowledge-graph",
    "label": "Knowledge Graph",
    "description": "Connect supercurricular ideas",
    "keywords": "supercurricular books lectures concepts",
    "area": "application",
    "featured": false
  },
  {
    "href": "/research-project",
    "label": "Research Project",
    "description": "Evidence, thesis and defence",
    "keywords": "research thesis evidence counterargument defence",
    "area": "application",
    "featured": false
  },
  {
    "href": "/tutorial-lab",
    "label": "Tutorial Lab",
    "description": "Draw, calculate and explain reasoning",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/unseen-lab",
    "label": "Unseen Material Lab",
    "description": "Graphs, sources and unfamiliar data",
    "keywords": "unseen graph data source interview stimulus",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/reasoning-lab",
    "label": "Reasoning Lab",
    "description": "Argument maps and misconceptions",
    "keywords": "rewind argument map fingerprint misconception",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/intervention-session",
    "label": "Intervention Session",
    "description": "Target recurring weaknesses",
    "keywords": "weakness intervention mistake remediation",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/working-analysis",
    "label": "Working Analysis",
    "description": "Analyse handwritten reasoning",
    "keywords": "handwritten photo image equations reasoning",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/learning-support",
    "label": "Learning Support",
    "description": "EAL and Mandarin scaffolds",
    "keywords": "eal mandarin bilingual glossary sentence frames",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/mistake-dna",
    "label": "Mistake DNA",
    "description": "Recurring reasoning and test-error patterns",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/progress-proof",
    "label": "Progress Proof",
    "description": "Evidence of what has improved",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/human-review",
    "label": "Human + AI Review",
    "description": "Teacher comments alongside automated analysis",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/parent-summary",
    "label": "Parent Summary",
    "description": "Privacy-safe progress overview",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/school-classroom",
    "label": "Student Classroom",
    "description": "Join a cohort and complete assigned preparation",
    "area": "progress",
    "featured": true
  },
  {
    "href": "/student/teacher-links",
    "label": "My linked teachers",
    "description": "See which teachers can access your progress summary",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/school-dashboard",
    "label": "School Dashboard",
    "description": "Cohorts, assignments, analytics and reports",
    "area": "school",
    "featured": true,
    "access": "owner"
  },
  {
    "href": "/teacher-dashboard",
    "label": "My Students",
    "description": "Track progress for students assigned to your teacher account",
    "area": "school",
    "featured": true,
    "access": "staff"
  },
  {
    "href": "/school/teachers",
    "label": "Manage Teachers",
    "description": "Assign school staff roles and link student accounts",
    "area": "school",
    "featured": true,
    "access": "manage"
  },
  {
    "href": "/premium",
    "label": "Full access",
    "description": "All preparation features are currently included",
    "area": "account",
    "featured": false
  },
  {
    "href": "/account",
    "label": "Account",
    "description": "Sign-in, saved work and preparation progress",
    "area": "account",
    "featured": true
  },
  {
    "href": "/accessibility-profiles",
    "label": "Accessibility",
    "description": "Saved accessibility profiles",
    "keywords": "large text contrast reading reduced motion",
    "area": "account",
    "featured": false
  },
  {
    "href": "/student-home",
    "label": "Home",
    "description": "Your preparation overview",
    "area": "home",
    "featured": false
  },
  {
    "href": "/teacher-coach",
    "label": "Teacher Coach",
    "description": "teacher meeting tutor comments interview packs mentor",
    "keywords": "teacher meeting tutor comments interview packs mentor",
    "area": "school",
    "featured": false,
    "access": "staff"
  },
  {
    "href": "/tutor",
    "label": "My Tutor",
    "description": "Personal academic coaching",
    "area": "tutor",
    "featured": true
  },
  {
    "href": "/tutor#academic-coach",
    "label": "Academic coach",
    "description": "Diagnose, learn and check understanding",
    "area": "tutor",
    "featured": true
  },
  {
    "href": "/preparation-pathway",
    "label": "Preparation pathway",
    "description": "Plan weekly subject activities",
    "area": "tutor",
    "featured": true
  },
  {
    "href": "/assessment-report",
    "label": "Academic assessment report",
    "description": "Compare academic evidence and next steps",
    "area": "progress",
    "featured": true
  },
  {
    "href": "/admissions-challenges",
    "label": "Targeted question practice",
    "description": "Fresh admissions-test questions",
    "area": "tests",
    "featured": true
  },
  {
    "href": "/history",
    "label": "Activity history",
    "description": "Past practice and saved work",
    "area": "progress",
    "featured": true
  },
  {
    "href": "/learning-trajectory",
    "label": "Learning trajectory",
    "description": "Review comparable evidence over time",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/reasoning-interview",
    "label": "Reasoning interview",
    "description": "Adaptive academic questioning",
    "area": "interviews",
    "featured": true
  },
  {
    "href": "/full-mock-interview",
    "label": "Full mock interview",
    "description": "Timed interview practice",
    "area": "interviews",
    "featured": true
  },
  {
    "href": "/interview-insights",
    "label": "Interview feedback",
    "description": "Transcript-linked evidence",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/admin",
    "label": "Administration",
    "description": "Platform administration",
    "area": "admin",
    "featured": true,
    "access": "admin"
  },
  {
    "href": "/school-insights",
    "label": "Cohort insights",
    "description": "School preparation priorities",
    "area": "school",
    "featured": false,
    "access": "owner"
  },
  {
    "href": "/school-reports",
    "label": "School reports",
    "description": "School reports and follow-up",
    "area": "school",
    "featured": false,
    "access": "owner"
  },
  {
    "href": "/privacy-centre",
    "label": "Privacy centre",
    "description": "Data access and privacy choices",
    "area": "account",
    "featured": false
  },
  {
    "href": "/support",
    "label": "Help and support",
    "description": "Get help with the platform",
    "area": "account",
    "featured": false
  },
  {
    "href": "/safeguarding",
    "label": "Safeguarding",
    "description": "Safety and reporting",
    "area": "account",
    "featured": false
  },
  {
    "href": "/digital-twin",
    "label": "Academic development profile",
    "description": "Connect independence, retention and transfer",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/tutor-autopilot",
    "label": "Guided preparation",
    "description": "Adaptive tutor-led practice",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/prep-week",
    "label": "Preparation week",
    "description": "Seven-day study programme",
    "area": "tutor",
    "featured": false
  },
  {
    "href": "/interview-academy",
    "label": "Interview preparation programme",
    "description": "Full guided preparation pathway",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/socratic-whiteboard",
    "label": "Whiteboard practice",
    "description": "Visual problem solving",
    "area": "interviews",
    "featured": false
  },
  {
    "href": "/reasoning-replay",
    "label": "Reasoning replay",
    "description": "Review reasoning and delayed retests",
    "area": "progress",
    "featured": false
  },
  {
    "href": "/evidence-locker",
    "label": "Academic portfolio",
    "description": "Save reading, work and reflections",
    "area": "application",
    "featured": false
  },
  {
    "href": "/reading-curriculum",
    "label": "Reading programme",
    "description": "Structured academic reading",
    "area": "application",
    "featured": false
  },
  {
    "href": "/written-work-defence",
    "label": "Written work defence",
    "description": "Defend reasoning and assumptions",
    "area": "application",
    "featured": false
  },
  {
    "href": "/essay-comparison",
    "label": "Compare essay drafts",
    "description": "Evaluate revisions",
    "area": "application",
    "featured": false
  },
  {
    "href": "/test-player",
    "label": "Timed question practice",
    "description": "Individual questions and timing",
    "area": "tests",
    "featured": false
  },
  {
    "href": "/retry-moment",
    "label": "Retry a reasoning moment",
    "description": "Fresh response to a previous difficulty",
    "area": "progress",
    "featured": false
  }
]
export function visibleTools(access:NavigationAccess){return access.signedIn?tools.filter(t=>!t.access||access[t.access]):[]}
export function routeArea(pathname:string):Area|null {
 const hub=studentAreas.find(a=>a.href===pathname)
 if(hub)return hub.id
 const match=tools.filter(t=>!t.href.includes("#")&&(pathname===t.href||pathname.startsWith(t.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0]
 return match?.area??null
}
export function searchTools(access:NavigationAccess,query:string){const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return visibleTools(access).filter(t=>terms.every(term=>(t.label+" "+t.description+" "+(t.keywords??"")+" "+t.area).toLowerCase().includes(term)))}
