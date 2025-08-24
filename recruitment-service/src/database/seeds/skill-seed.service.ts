import { DataSource } from 'typeorm';
import { SkillEntity, SkillCategory } from '../../entities/recruitment/skill.entity';
import { SkillAliasEntity } from '../../entities/recruitment/skill-alias.entity';

interface SkillSeedData {
   canonicalName: string;
   category: SkillCategory;
   description?: string;
   priority?: number;
   aliases: string[];
}

export class SkillSeedService {
   
   static async seedCommonSkills(dataSource: DataSource): Promise<void> {
      const skillRepository = dataSource.getRepository(SkillEntity);
      const aliasRepository = dataSource.getRepository(SkillAliasEntity);
      
      console.log('Seeding common skills...');

      const commonSkills: SkillSeedData[] = [
         // Programming Languages
         {
            canonicalName: 'JavaScript',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình JavaScript cho web development',
            priority: 9,
            aliases: ['JS', 'Javascript', 'js', 'ECMAScript', 'ES6', 'ES2015', 'ES2020']
         },
         {
            canonicalName: 'TypeScript',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình TypeScript với type safety',
            priority: 8,
            aliases: ['TS', 'Typescript', 'ts']
         },
         {
            canonicalName: 'Python',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình Python',
            priority: 9,
            aliases: ['python', 'py', 'Python3', 'Python 3']
         },
         {
            canonicalName: 'Java',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình Java',
            priority: 8,
            aliases: ['java', 'OpenJDK', 'Oracle Java', 'Java SE', 'Java EE']
         },
         {
            canonicalName: 'C#',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình C# của Microsoft',
            priority: 7,
            aliases: ['C Sharp', 'CSharp', 'c#', '.NET', 'dotnet']
         },
         {
            canonicalName: 'Go',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình Go (Golang)',
            priority: 7,
            aliases: ['Golang', 'golang', 'go']
         },
         {
            canonicalName: 'Rust',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình Rust',
            priority: 6,
            aliases: ['rust', 'rustlang']
         },
         {
            canonicalName: 'PHP',
            category: SkillCategory.PROGRAMMING_LANGUAGE,
            description: 'Ngôn ngữ lập trình PHP cho web',
            priority: 7,
            aliases: ['php', 'PHP7', 'PHP8']
         },

         // Frameworks - JavaScript/TypeScript
         {
            canonicalName: 'React',
            category: SkillCategory.FRAMEWORK,
            description: 'Thư viện JavaScript để xây dựng user interfaces',
            priority: 9,
            aliases: ['React.js', 'ReactJS', 'react', 'react.js']
         },
         {
            canonicalName: 'Next.js',
            category: SkillCategory.FRAMEWORK,
            description: 'React framework cho production',
            priority: 8,
            aliases: ['NextJS', 'next', 'next.js', 'Nextjs']
         },
         {
            canonicalName: 'Vue.js',
            category: SkillCategory.FRAMEWORK,
            description: 'Progressive JavaScript framework',
            priority: 7,
            aliases: ['Vue', 'VueJS', 'vue', 'vue.js', 'Vue 3', 'Vuejs']
         },
         {
            canonicalName: 'Angular',
            category: SkillCategory.FRAMEWORK,
            description: 'TypeScript-based web application framework',
            priority: 7,
            aliases: ['AngularJS', 'angular', 'Angular 2+', 'ng']
         },
         {
            canonicalName: 'Node.js',
            category: SkillCategory.FRAMEWORK,
            description: 'JavaScript runtime cho server-side development',
            priority: 9,
            aliases: ['NodeJS', 'node', 'node.js', 'Nodejs']
         },
         {
            canonicalName: 'Express.js',
            category: SkillCategory.FRAMEWORK,
            description: 'Web framework cho Node.js',
            priority: 8,
            aliases: ['Express', 'ExpressJS', 'express', 'express.js']
         },
         {
            canonicalName: 'NestJS',
            category: SkillCategory.FRAMEWORK,
            description: 'Node.js framework cho scalable server-side applications',
            priority: 7,
            aliases: ['Nest.js', 'nest', 'nestjs', 'Nest']
         },

         // Frameworks - Backend
         {
            canonicalName: 'Spring Boot',
            category: SkillCategory.FRAMEWORK,
            description: 'Java framework cho microservices',
            priority: 8,
            aliases: ['Spring', 'SpringBoot', 'spring-boot']
         },
         {
            canonicalName: 'Django',
            category: SkillCategory.FRAMEWORK,
            description: 'Python web framework',
            priority: 7,
            aliases: ['django', 'Django REST', 'DRF']
         },
         {
            canonicalName: 'FastAPI',
            category: SkillCategory.FRAMEWORK,
            description: 'Modern Python web framework',
            priority: 6,
            aliases: ['fastapi', 'fast-api']
         },
         {
            canonicalName: 'Laravel',
            category: SkillCategory.FRAMEWORK,
            description: 'PHP web framework',
            priority: 6,
            aliases: ['laravel']
         },

         // Databases
         {
            canonicalName: 'PostgreSQL',
            category: SkillCategory.DATABASE,
            description: 'Open-source relational database',
            priority: 8,
            aliases: ['Postgres', 'postgres', 'postgresql', 'pg', 'psql']
         },
         {
            canonicalName: 'MySQL',
            category: SkillCategory.DATABASE,
            description: 'Relational database management system',
            priority: 8,
            aliases: ['mysql', 'MySQL 8', 'MariaDB']
         },
         {
            canonicalName: 'MongoDB',
            category: SkillCategory.DATABASE,
            description: 'NoSQL document database',
            priority: 7,
            aliases: ['mongo', 'mongodb', 'Mongo DB']
         },
         {
            canonicalName: 'Redis',
            category: SkillCategory.DATABASE,
            description: 'In-memory data structure store',
            priority: 7,
            aliases: ['redis', 'Redis Cache']
         },
         {
            canonicalName: 'Elasticsearch',
            category: SkillCategory.DATABASE,
            description: 'Distributed search and analytics engine',
            priority: 6,
            aliases: ['ElasticSearch', 'elastic search', 'ES']
         },

         // Cloud Platforms
         {
            canonicalName: 'AWS',
            category: SkillCategory.CLOUD_PLATFORM,
            description: 'Amazon Web Services cloud platform',
            priority: 9,
            aliases: ['Amazon Web Services', 'aws', 'Amazon AWS']
         },
         {
            canonicalName: 'Google Cloud',
            category: SkillCategory.CLOUD_PLATFORM,
            description: 'Google Cloud Platform',
            priority: 7,
            aliases: ['GCP', 'Google Cloud Platform', 'gcp']
         },
         {
            canonicalName: 'Microsoft Azure',
            category: SkillCategory.CLOUD_PLATFORM,
            description: 'Microsoft Azure cloud platform',
            priority: 7,
            aliases: ['Azure', 'azure', 'MS Azure']
         },

         // Tools
         {
            canonicalName: 'Docker',
            category: SkillCategory.TOOL,
            description: 'Containerization platform',
            priority: 8,
            aliases: ['docker', 'Docker Compose', 'docker-compose']
         },
         {
            canonicalName: 'Kubernetes',
            category: SkillCategory.TOOL,
            description: 'Container orchestration platform',
            priority: 7,
            aliases: ['k8s', 'kubernetes', 'K8s']
         },
         {
            canonicalName: 'Git',
            category: SkillCategory.TOOL,
            description: 'Version control system',
            priority: 9,
            aliases: ['git', 'GitHub', 'GitLab', 'Bitbucket']
         },
         {
            canonicalName: 'Jenkins',
            category: SkillCategory.TOOL,
            description: 'CI/CD automation server',
            priority: 6,
            aliases: ['jenkins']
         },

         // Methodologies
         {
            canonicalName: 'Agile',
            category: SkillCategory.METHODOLOGY,
            description: 'Agile software development methodology',
            priority: 8,
            aliases: ['agile', 'Scrum', 'scrum', 'Kanban', 'kanban']
         },
         {
            canonicalName: 'DevOps',
            category: SkillCategory.METHODOLOGY,
            description: 'Development and Operations practices',
            priority: 7,
            aliases: ['devops', 'Dev Ops', 'CI/CD', 'CICD']
         },

         // Soft Skills
         {
            canonicalName: 'Team Leadership',
            category: SkillCategory.SOFT_SKILL,
            description: 'Khả năng lãnh đạo nhóm',
            priority: 8,
            aliases: ['Leadership', 'Team Lead', 'Tech Lead', 'Engineering Manager']
         },
         {
            canonicalName: 'Problem Solving',
            category: SkillCategory.SOFT_SKILL,
            description: 'Khả năng giải quyết vấn đề',
            priority: 8,
            aliases: ['Problem-solving', 'Analytical Thinking', 'Critical Thinking']
         },
         {
            canonicalName: 'Communication',
            category: SkillCategory.SOFT_SKILL,
            description: 'Kỹ năng giao tiếp',
            priority: 8,
            aliases: ['English Communication', 'Presentation', 'Documentation']
         }
      ];

      for (const skillData of commonSkills) {
         try {
            // Check if skill already exists
            const existingSkill = await skillRepository.findOne({
               where: { canonicalName: skillData.canonicalName }
            });

            if (existingSkill) {
               console.log(`Skill "${skillData.canonicalName}" already exists, skipping...`);
               continue;
            }

            // Create skill
            const skill = skillRepository.create({
               canonicalName: skillData.canonicalName,
               category: skillData.category,
               description: skillData.description,
               priority: skillData.priority || 5,
               isActive: true,
               metadata: {
                  seeded: true,
                  seedDate: new Date().toISOString()
               }
            });

            const savedSkill = await skillRepository.save(skill);

            // Create aliases
            for (const aliasName of skillData.aliases) {
               try {
                  const alias = aliasRepository.create({
                     skillId: savedSkill.skillId,
                     aliasName,
                     context: 'Common industry alias',
                     confidence: 9,
                     isActive: true
                  });

                  await aliasRepository.save(alias);
               } catch (error) {
                  // Alias might already exist, continue
                  console.log(`Alias "${aliasName}" for "${skillData.canonicalName}" already exists or failed: ${error.message}`);
               }
            }

            console.log(`Created skill: ${skillData.canonicalName} with ${skillData.aliases.length} aliases`);

         } catch (error) {
            console.error(`Failed to create skill "${skillData.canonicalName}": ${error.message}`);
         }
      }

      console.log('Skill seeding completed!');
   }
}
