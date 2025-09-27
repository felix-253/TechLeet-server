import { Injectable } from '@nestjs/common';
import { FileEntity } from '../../../../entities/recruitment/file.entity';

@Injectable()
export class CvAnalyzer {
   /**
    * Analyze CV files (PDF and DOCX)
    */
   async analyzeCVFile(cvFile: FileEntity): Promise<any> {
      const fileSizeMB = cvFile.fileSize / (1024 * 1024);
      const fileName = cvFile.originalName.toLowerCase();

      // CV-specific keywords for filename analysis
      const cvKeywords = [
         'cv', 'resume', 'curriculum', 'vitae', 'profile', 'bio',
         'portfolio', 'experience', 'background', 'career',
         'hoso', 'lichsu', 'bangcap', 'kinhnghiem', // Vietnamese
         'sơ yếu', 'lý lịch', 'kinh nghiệm' // Vietnamese with diacritics
      ];

      const detectedCVKeywords = cvKeywords.filter(keyword =>
         fileName.includes(keyword)
      );

      // Enhanced analysis for different file types
      if (cvFile.mimeType === 'application/pdf') {
         return this.analyzePDFCV(cvFile, detectedCVKeywords, fileSizeMB);
      } else if (cvFile.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
         return this.analyzeDocxCV(cvFile, detectedCVKeywords, fileSizeMB);
      } else {
         return this.analyzeGenericCV(cvFile, detectedCVKeywords, fileSizeMB);
      }
   }

   private analyzePDFCV(cvFile: FileEntity, keywords: string[], fileSizeMB: number) {
      return {
         type: 'pdf_cv',
         fileSize: `${fileSizeMB.toFixed(2)} MB`,
         format: 'PDF',
         isOptimalFormat: true,
         detectedKeywords: keywords,
         confidence: this.calculateCVConfidence(keywords, fileSizeMB, 'pdf'),
         summary: this.generateCVSummary('PDF CV', keywords, fileSizeMB),
         recommendations: this.generatePDFCVRecommendations(fileSizeMB, keywords),
         technicalDetails: {
            atsCompatible: true,
            requiresTextExtraction: true,
            printFriendly: true,
            editingDifficulty: 'hard'
         }
      };
   }

   private analyzeDocxCV(cvFile: FileEntity, keywords: string[], fileSizeMB: number) {
      return {
         type: 'docx_cv',
         fileSize: `${fileSizeMB.toFixed(2)} MB`,
         format: 'DOCX',
         isOptimalFormat: true,
         detectedKeywords: keywords,
         confidence: this.calculateCVConfidence(keywords, fileSizeMB, 'docx'),
         summary: this.generateCVSummary('Word CV', keywords, fileSizeMB),
         recommendations: this.generateDocxCVRecommendations(fileSizeMB, keywords),
         technicalDetails: {
            atsCompatible: true,
            requiresTextExtraction: true,
            printFriendly: true,
            editingDifficulty: 'easy'
         }
      };
   }

   private analyzeGenericCV(cvFile: FileEntity, keywords: string[], fileSizeMB: number) {
      const fileExtension = cvFile.originalName.split('.').pop()?.toLowerCase() || 'unknown';
      
      return {
         type: 'generic_cv',
         fileSize: `${fileSizeMB.toFixed(2)} MB`,
         format: fileExtension.toUpperCase(),
         isOptimalFormat: ['pdf', 'doc', 'docx'].includes(fileExtension),
         detectedKeywords: keywords,
         confidence: this.calculateCVConfidence(keywords, fileSizeMB, 'generic'),
         summary: this.generateCVSummary(`${fileExtension.toUpperCase()} CV`, keywords, fileSizeMB),
         recommendations: this.generateGenericCVRecommendations(fileExtension, fileSizeMB),
         technicalDetails: {
            atsCompatible: ['pdf', 'doc', 'docx', 'txt'].includes(fileExtension),
            requiresTextExtraction: !['txt', 'rtf'].includes(fileExtension),
            printFriendly: ['pdf', 'doc', 'docx'].includes(fileExtension),
            editingDifficulty: ['txt', 'rtf'].includes(fileExtension) ? 'easy' : 'medium'
         }
      };
   }

   private calculateCVConfidence(keywords: string[], fileSizeMB: number, type: string): 'high' | 'medium' | 'low' {
      let score = 0;

      // Keyword indicators (40 points max)
      score += Math.min(keywords.length * 20, 40);

      // File size indicators (30 points)
      if (fileSizeMB >= 0.1 && fileSizeMB <= 5) {
         score += 30; // Reasonable CV size
      } else if (fileSizeMB <= 10) {
         score += 15; // Acceptable but large
      }

      // File type bonus (30 points)
      if (type === 'pdf' || type === 'docx') {
         score += 30;
      } else if (type === 'doc' || type === 'txt') {
         score += 15;
      }

      if (score >= 70) return 'high';
      if (score >= 40) return 'medium';
      return 'low';
   }

   private generateCVSummary(baseType: string, keywords: string[], fileSizeMB: number): string {
      const keywordSummary = keywords.length > 0 ? ` (${keywords.join(', ')})` : '';
      const sizeSummary = fileSizeMB > 5 ? ' - Large file' : '';
      
      return `${baseType}${keywordSummary}${sizeSummary}`;
   }

   private generatePDFCVRecommendations(fileSizeMB: number, keywords: string[]): string[] {
      const recommendations: string[] = [
         'PDF format is excellent for ATS compatibility and professional presentation'
      ];

      if (fileSizeMB > 5) {
         recommendations.push('Large file size - consider optimizing images or reducing file size');
      } else if (fileSizeMB < 0.1) {
         recommendations.push('Very small file - verify content completeness');
      }

      if (keywords.length === 0) {
         recommendations.push('No CV keywords detected in filename - verify file contains resume/CV content');
      }

      recommendations.push('Ready for ATS parsing and text extraction');
      
      return recommendations;
   }

   private generateDocxCVRecommendations(fileSizeMB: number, keywords: string[]): string[] {
      const recommendations: string[] = [
         'DOCX format is excellent for ATS compatibility and easy editing'
      ];

      if (fileSizeMB > 3) {
         recommendations.push('Consider optimizing file size - DOCX files are typically smaller than PDFs');
      }

      if (keywords.length === 0) {
         recommendations.push('No CV keywords detected in filename - verify file contains resume/CV content');
      }

      recommendations.push('Can be easily parsed for keywords and formatting');
      recommendations.push('Editable format - good for template creation');
      
      return recommendations;
   }

   private generateGenericCVRecommendations(fileExtension: string, fileSizeMB: number): string[] {
      const recommendations: string[] = [];

      switch (fileExtension.toLowerCase()) {
         case 'txt':
            recommendations.push('Plain text format - excellent for ATS but lacks formatting');
            recommendations.push('Consider converting to PDF or DOCX for better presentation');
            break;
         
         case 'rtf':
            recommendations.push('RTF format is compatible but not widely preferred');
            recommendations.push('Consider converting to PDF or DOCX for better compatibility');
            break;
         
         case 'jpg':
         case 'jpeg':
         case 'png':
            recommendations.push('Image format detected - OCR required for text extraction');
            recommendations.push('Not ATS-friendly - consider converting to PDF or DOCX');
            break;
         
         default:
            recommendations.push('Unusual format for CV - may require special handling');
            recommendations.push('Consider converting to standard formats (PDF, DOCX)');
      }

      if (fileSizeMB > 10) {
         recommendations.push('Very large file - consider optimization');
      }

      return recommendations;
   }
}
