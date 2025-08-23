# Sample CV Data for Testing

## 📄 **Sample CV Content**

Create a PDF file with the following content for testing the CV screening flow:

### Sample CV 1: Strong Match
```
NGUYEN VAN AN
Senior Full Stack Developer
📧 nguyen.van.an@example.com | 📱 +84 901 234 567
📍 Ho Chi Minh City, Vietnam

PROFESSIONAL SUMMARY
Experienced full-stack developer with 6+ years of expertise in modern web technologies.
Proven track record in building scalable applications using React, Node.js, and TypeScript.
Strong background in database design and cloud deployment.

WORK EXPERIENCE

Senior Software Engineer | TechCorp Vietnam (Jan 2020 - Present)
• Led development of React-based e-commerce platform serving 100K+ users
• Built RESTful APIs using Node.js, Express, and TypeScript
• Designed and optimized PostgreSQL database schemas
• Implemented CI/CD pipelines using Docker and AWS
• Mentored junior developers and conducted code reviews

Full Stack Developer | StartupXYZ (Jun 2018 - Dec 2019)
• Developed responsive web applications using React and Redux
• Created backend services with Node.js and MongoDB
• Integrated third-party APIs and payment gateways
• Collaborated with UI/UX designers using Figma

Junior Developer | WebSolutions (Jan 2017 - May 2018)
• Built websites using HTML5, CSS3, and JavaScript
• Learned React and modern development practices
• Participated in agile development processes

EDUCATION
Bachelor of Computer Science
University of Technology, Ho Chi Minh City (2013-2017)
GPA: 3.7/4.0

TECHNICAL SKILLS
• Frontend: React, TypeScript, HTML5, CSS3, JavaScript ES6+, Redux, Next.js
• Backend: Node.js, Express, NestJS, RESTful APIs, GraphQL
• Databases: PostgreSQL, MongoDB, Redis, MySQL
• Cloud & DevOps: AWS (EC2, S3, RDS), Docker, Kubernetes, CI/CD
• Tools: Git, Webpack, Jest, Cypress, Postman, Jira

PROJECTS
E-Commerce Platform (2020-2023)
• Built scalable platform handling 10K+ daily transactions
• Technologies: React, Node.js, PostgreSQL, AWS, Docker

Task Management App (2019)
• Full-stack application with real-time updates
• Technologies: React, Socket.io, MongoDB, Express

CERTIFICATIONS
• AWS Certified Developer Associate (2022)
• MongoDB Certified Developer (2021)

LANGUAGES
• Vietnamese (Native)
• English (Fluent)
• Japanese (Basic)
```

### Sample CV 2: Moderate Match
```
TRAN THI MINH
Frontend Developer
📧 tran.minh@example.com | 📱 +84 987 654 321
📍 Hanoi, Vietnam

PROFESSIONAL SUMMARY
Frontend developer with 3 years of experience in React development.
Passionate about creating user-friendly interfaces and learning new technologies.

WORK EXPERIENCE

Frontend Developer | DigitalAgency (Mar 2021 - Present)
• Developed responsive websites using React and CSS
• Worked with design team to implement UI/UX designs
• Used Git for version control and collaboration

Junior Frontend Developer | WebStudio (Jun 2020 - Feb 2021)
• Created landing pages using HTML, CSS, and JavaScript
• Learned React and modern frontend frameworks
• Participated in team meetings and code reviews

Intern Developer | TechStart (Jan 2020 - May 2020)
• Assisted in website development projects
• Learned basic programming concepts
• Shadowed senior developers

EDUCATION
Bachelor of Information Technology
Hanoi University of Science and Technology (2016-2020)
GPA: 3.2/4.0

TECHNICAL SKILLS
• Frontend: React, HTML5, CSS3, JavaScript, Bootstrap
• Tools: Git, VS Code, Figma
• Basic: Node.js, MySQL

PROJECTS
Portfolio Website (2021)
• Personal portfolio showcasing projects
• Technologies: React, CSS3, Netlify

Restaurant Website (2020)
• Static website for local restaurant
• Technologies: HTML, CSS, JavaScript
```

### Sample CV 3: Poor Match
```
PHAM VAN BINH
Graphic Designer
📧 pham.binh@example.com | 📱 +84 912 345 678
📍 Da Nang, Vietnam

PROFESSIONAL SUMMARY
Creative graphic designer with 4 years of experience in print and digital design.
Skilled in Adobe Creative Suite and brand identity development.

WORK EXPERIENCE

Senior Graphic Designer | CreativeStudio (Jan 2020 - Present)
• Designed marketing materials for various clients
• Created brand identities and logo designs
• Managed multiple design projects simultaneously

Graphic Designer | PrintShop (Jun 2018 - Dec 2019)
• Designed brochures, flyers, and business cards
• Worked with clients to understand design requirements
• Prepared files for print production

Junior Designer | AdAgency (Jan 2017 - May 2018)
• Assisted senior designers with various projects
• Created social media graphics and web banners
• Learned industry best practices

EDUCATION
Bachelor of Fine Arts - Graphic Design
Da Nang University of Arts (2013-2017)

TECHNICAL SKILLS
• Design Software: Adobe Photoshop, Illustrator, InDesign, After Effects
• Web: Basic HTML, CSS
• Other: Photography, Typography, Color Theory

PROJECTS
Brand Identity for Local Coffee Shop (2022)
• Complete brand package including logo, business cards, signage
• Tools: Adobe Illustrator, Photoshop

Event Poster Series (2021)
• Marketing materials for music festival
• Tools: Adobe Creative Suite
```

## 🧪 **Testing Scenarios**

### Scenario 1: Perfect Match Test
1. Create job posting for "Senior Full Stack Developer" requiring React, Node.js, TypeScript, 5+ years experience
2. Upload Sample CV 1 (Nguyen Van An)
3. Expected Result: Score 85-95, Status: "Strong Fit"

### Scenario 2: Partial Match Test
1. Same job posting as above
2. Upload Sample CV 2 (Tran Thi Minh)
3. Expected Result: Score 50-65, Status: "Moderate Fit"

### Scenario 3: Poor Match Test
1. Same job posting as above
2. Upload Sample CV 3 (Pham Van Binh)
3. Expected Result: Score 10-30, Status: "Poor Fit"

## 📊 **Expected Screening Results**

### Sample CV 1 Results:
```json
{
  "overallScore": 88.5,
  "skillsScore": 95.0,
  "experienceScore": 85.0,
  "educationScore": 85.0,
  "keyHighlights": [
    "6+ years of full-stack development experience",
    "Strong proficiency in React, Node.js, and TypeScript",
    "AWS certification and cloud experience",
    "Leadership and mentoring experience"
  ],
  "concerns": [
    "No specific experience with the company's domain"
  ]
}
```

### Sample CV 2 Results:
```json
{
  "overallScore": 58.2,
  "skillsScore": 70.0,
  "experienceScore": 45.0,
  "educationScore": 60.0,
  "keyHighlights": [
    "3 years of React development experience",
    "Good understanding of frontend technologies",
    "Team collaboration experience"
  ],
  "concerns": [
    "Limited backend experience",
    "No TypeScript or advanced framework experience",
    "Below required experience level"
  ]
}
```

### Sample CV 3 Results:
```json
{
  "overallScore": 22.1,
  "skillsScore": 15.0,
  "experienceScore": 20.0,
  "educationScore": 30.0,
  "keyHighlights": [
    "Strong design background",
    "Creative problem-solving skills"
  ],
  "concerns": [
    "No programming experience",
    "Skills don't match job requirements",
    "Different career focus (design vs development)"
  ]
}
```

## 🔧 **Quick Test Commands**

### Create Test Job Posting
```bash
curl -X POST http://localhost:3033/api/job-postings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Senior Full Stack Developer",
    "description": "We are seeking an experienced full-stack developer to join our growing team. You will be responsible for developing and maintaining web applications using modern technologies.",
    "requirements": "5+ years of experience with React, Node.js, TypeScript, PostgreSQL. Experience with AWS and Docker preferred.",
    "skills": "React, Node.js, TypeScript, PostgreSQL, AWS, Docker, Git",
    "experienceLevel": "Senior",
    "minExperience": 5,
    "maxExperience": 10,
    "educationLevel": "Bachelor degree in Computer Science or related field",
    "location": "Ho Chi Minh City, Vietnam",
    "employmentType": "Full-time",
    "salaryMin": 2000,
    "salaryMax": 3500,
    "currency": "USD",
    "isActive": true
  }'
```

### Create Test Candidates
```bash
# Candidate 1 - Strong Match
curl -X POST http://localhost:3033/api/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Nguyen",
    "lastName": "Van An",
    "email": "nguyen.van.an@example.com",
    "phone": "+84901234567",
    "address": "District 1, Ho Chi Minh City",
    "dateOfBirth": "1990-05-15",
    "nationality": "Vietnamese"
  }'

# Candidate 2 - Moderate Match
curl -X POST http://localhost:3033/api/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Tran",
    "lastName": "Thi Minh",
    "email": "tran.minh@example.com",
    "phone": "+84987654321",
    "address": "Hanoi, Vietnam",
    "dateOfBirth": "1995-08-20",
    "nationality": "Vietnamese"
  }'
```

## 📈 **Performance Benchmarks**

### Expected Processing Times:
- **Text Extraction**: 1-3 seconds
- **NLP Processing**: 2-5 seconds  
- **Embedding Generation**: 3-8 seconds
- **Similarity Calculation**: 1-2 seconds
- **AI Summary**: 5-15 seconds
- **Total Time**: 12-33 seconds

### Queue Performance:
- **Concurrent Jobs**: Up to 5 simultaneous screenings
- **Throughput**: 10-20 CVs per minute
- **Error Rate**: < 5% under normal conditions

Use these samples to thoroughly test your CV screening pipeline!
