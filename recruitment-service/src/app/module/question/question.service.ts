import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QuestionEntity } from "../../../entities/question/question.entity";
import { Repository } from "typeorm";
import { ApplicationEntity } from "../../../entities/recruitment/application.entity";
import { CandidateEntity } from "../../../entities/recruitment/candidate.entity";
import { QuestionSetEntity } from "../../../entities/question/question_set.entity";
import { ExaminationEntity } from "../../../entities/question/examination.entity";
import { QuestionSetItemEntity } from "../../../entities/question/question_set_item.entity";

@Injectable()
export class QuestionService {
    constructor(
        @InjectRepository(QuestionEntity)
        private readonly questionRepository: Repository<QuestionEntity>,
        @InjectRepository(QuestionSetEntity)
        private readonly questionSetRepository: Repository<QuestionSetEntity>,
        @InjectRepository(ExaminationEntity)
        private readonly examinationRepository: Repository<ExaminationEntity>,
        @InjectRepository(QuestionSetItemEntity)
        private readonly questionSetItemRepository: Repository<QuestionSetItemEntity>,
        @InjectRepository(ApplicationEntity)
        private readonly applicationRepository: Repository<ApplicationEntity>,
        @InjectRepository(CandidateEntity)
        private readonly candidateRepository: Repository<CandidateEntity>,
    ) {}
}