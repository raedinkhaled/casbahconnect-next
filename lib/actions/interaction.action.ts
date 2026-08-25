"use server";

import Question from "@/database/question.model";
import { connectToDatabase } from "../mongoose";
import { ViewQuestionParams } from "./shared.types";
import Interaction from "@/database/interaction.model";
import { getCurrentUser } from "@/lib/auth-user";

export async function viewQuestion(params: ViewQuestionParams) {
  try {
    await connectToDatabase();

    const { questionId } = params;
    const actor = await getCurrentUser();

    // Update View Count

    await Question.findByIdAndUpdate(questionId, { $inc: { views: 1 } });

    if (actor) {
      const existingInteraction = await Interaction.findOne({
        user: actor._id,
        action: "view",
        question: questionId,
      });
      if (existingInteraction) return console.log("User already viewed");

      await Interaction.create({
        user: actor._id,
        action: "view",
        question: questionId,
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}
