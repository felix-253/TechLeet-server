import { Injectable, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionEntity } from "../../../entities/question/question.entity";
import { QuestionSetEntity } from "../../../entities/question/question_set.entity";
import { ExaminationEntity } from "../../../entities/question/examination.entity";
import { QuestionSetItemEntity } from "../../../entities/question/question_set_item.entity";
import { ApplicationEntity } from "../../../entities/recruitment/application.entity";
import { CandidateEntity } from "../../../entities/recruitment/candidate.entity";
import { QuestionController } from "./question.controller";
import { QuestionService } from "./question.service";

@Module(
       {
imports:[
    TypeOrmModule.forFeature([QuestionEntity, QuestionSetEntity,ExaminationEntity,QuestionSetItemEntity,ApplicationEntity,CandidateEntity])

]   ,
    controllers: [QuestionController],
    providers: [QuestionService],
    exports: [QuestionService],
       } 
)
export class QuestionModule {}