/**
 * @file cq-ingestion.validation.test.ts
 * @description Unit tests for Creative Question (CQ) Ingestion Zod validation schemas.
 * Tests acceptance criteria:
 * 1. Uddipok (stimulus/stem) rich text / image
 * 2. Exactly 4 sub-questions (ক, খ, গ, ঘ)
 * 3. Individual marks (ক=1, খ=2, গ=3, ঘ=4 default)
 * 4. Total marks validation (default = 10 marks per set)
 */

import { describe, expect, it } from "vitest";
import { CQValidation } from "../cq-ingestion.validation";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

const validCQSubQuestions = [
  {
    label: "ক" as const,
    cognitiveLevel: "KNOWLEDGE" as const,
    questionText: "তড়িৎ প্রবাহ কাকে বলে?",
    marks: 1.0,
    explanation: "কোনো পরিবাহীর যেকোনো প্রস্থচ্ছেদের মধ্য দিয়ে একক সময়ে যে পরিমাণ আধান প্রবাহিত হয় তাকে তড়িৎ প্রবাহ বলে।",
    difficulty: "EASY" as const,
    order: 1,
  },
  {
    label: "খ" as const,
    cognitiveLevel: "COMPREHENSION" as const,
    questionText: "ওহমের সূত্রটি ব্যাখ্যা করো।",
    marks: 2.0,
    explanation: "নির্দিষ্ট তাপমাত্রায় কোনো পরিবাহীর মধ্য দিয়ে প্রবাহিত তড়িৎ প্রবাহ পরিবাহীর দুই প্রান্তের বিভব পার্থক্যের সমানুপাতিক। $I \\propto V$ বা $V = IR$।",
    difficulty: "MEDIUM" as const,
    order: 2,
  },
  {
    label: "গ" as const,
    cognitiveLevel: "APPLICATION" as const,
    questionText: "উদ্দীপকের বর্তনীর তুল্য রোধ নির্ণয় করো।",
    marks: 3.0,
    explanation: "বর্তনীতে $R_1$ এবং $R_2$ সমান্তরালে এবং $R_3$ শ্রেণিতে যুক্ত। $R_p = \\frac{R_1 R_2}{R_1 + R_2} = \\frac{6 \\times 3}{6 + 3} = 2\\,\\Omega$। মোট তুল্য রোধ $R_{eq} = R_p + R_3 = 2 + 4 = 6\\,\\Omega$।",
    difficulty: "MEDIUM" as const,
    order: 3,
  },
  {
    label: "ঘ" as const,
    cognitiveLevel: "HIGHER_ABILITY" as const,
    questionText: "উভয় ক্ষেত্রে তড়িৎ প্রবাহের কোনো পরিবর্তন ঘটবে কি না? গাণিতিক বিশ্লেষণের মাধ্যমে মতামত দাও।",
    marks: 4.0,
    explanation: "প্রথম ক্ষেত্রে মোট প্রবাহ $I_1 = \\frac{E}{R_{eq} + r} = \\frac{12}{6 + 0} = 2\\text{ A}$। দ্বিতীয় ক্ষেত্রে পরিবর্তন হিসাব করে বিশ্লেষণ দেখানো হলো।",
    difficulty: "HARD" as const,
    order: 4,
  },
];

describe("CQ Ingestion Zod Validation Schemas", () => {
  describe("cqSubQuestionItemSchema", () => {
    it("should accept valid single sub-question with valid cognitive levels", () => {
      const cognitiveLevels = ["KNOWLEDGE", "COMPREHENSION", "APPLICATION", "HIGHER_ABILITY"] as const;
      for (const level of cognitiveLevels) {
        const item = {
          label: "ক",
          cognitiveLevel: level,
          questionText: "Sample question?",
          marks: 1.0,
        };
        const res = CQValidation.cqSubQuestionItemSchema.safeParse(item);
        expect(res.success).toBe(true);
      }
    });

    it("should reject invalid cognitive level", () => {
      const item = {
        label: "ক",
        cognitiveLevel: "INVALID_LEVEL",
        questionText: "Sample question?",
        marks: 1.0,
      };
      const res = CQValidation.cqSubQuestionItemSchema.safeParse(item);
      expect(res.success).toBe(false);
    });

    it("should reject sub-question with marks less than 0.5 or greater than 10", () => {
      const tooLow = {
        label: "ক",
        cognitiveLevel: "KNOWLEDGE",
        questionText: "Sample question?",
        marks: 0.1,
      };
      expect(CQValidation.cqSubQuestionItemSchema.safeParse(tooLow).success).toBe(false);

      const tooHigh = {
        label: "ঘ",
        cognitiveLevel: "HIGHER_ABILITY",
        questionText: "Sample question?",
        marks: 15,
      };
      expect(CQValidation.cqSubQuestionItemSchema.safeParse(tooHigh).success).toBe(false);
    });
  });

  describe("fourSubQuestionsValidation & Acceptance Criteria", () => {
    it("should accept valid 4 structured sub-questions (ক, খ, গ, ঘ)", () => {
      const result = CQValidation.fourSubQuestionsValidation.safeParse(validCQSubQuestions);
      expect(result.success).toBe(true);
    });

    it("should reject sub-questions array with fewer than 4 items", () => {
      const fewerQuestions = validCQSubQuestions.slice(0, 3);
      const result = CQValidation.fourSubQuestionsValidation.safeParse(fewerQuestions);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("exactly 4 sub-questions");
      }
    });

    it("should reject sub-questions array with more than 4 items", () => {
      const extraQuestions = [
        ...validCQSubQuestions,
        {
          label: "ঘ" as const,
          cognitiveLevel: "HIGHER_ABILITY" as const,
          questionText: "অতিরিক্ত প্রশ্ন?",
          marks: 4.0,
        },
      ];
      const result = CQValidation.fourSubQuestionsValidation.safeParse(extraQuestions);
      expect(result.success).toBe(false);
    });

    it("should reject when duplicate labels exist and one label is missing", () => {
      const duplicateLabels = [
        validCQSubQuestions[0],
        validCQSubQuestions[1],
        validCQSubQuestions[2],
        { ...validCQSubQuestions[3], label: "গ" as const }, // Duplicate 'গ', missing 'ঘ'
      ];
      const result = CQValidation.fourSubQuestionsValidation.safeParse(duplicateLabels);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("CQ must include all 4 sub-question labels");
      }
    });

    it("should reject sub-question with empty or whitespace questionText", () => {
      const emptyTextQuestions = [
        validCQSubQuestions[0],
        { ...validCQSubQuestions[1], questionText: "   " },
        validCQSubQuestions[2],
        validCQSubQuestions[3],
      ];
      const result = CQValidation.fourSubQuestionsValidation.safeParse(emptyTextQuestions);
      expect(result.success).toBe(false);
    });
  });

  describe("cqStimulusSchema", () => {
    it("should accept valid stimulus with media URL and taxonomy IDs", () => {
      const stimulus = {
        title: "উদ্দীপক ১",
        contextText: "একটি বর্তনী যাতে...",
        contextType: "STEM" as const,
        mediaUrl: "https://example.com/image.png",
        educationLevelId: VALID_UUID,
        subjectId: VALID_UUID,
        chapterId: VALID_UUID,
        topicId: VALID_UUID,
      };

      const result = CQValidation.cqStimulusSchema.safeParse(stimulus);
      expect(result.success).toBe(true);
    });

    it("should accept valid stimulus with empty string as mediaUrl", () => {
      const stimulus = {
        contextText: "উদ্দীপক বিবরণ...",
        mediaUrl: "",
      };
      const result = CQValidation.cqStimulusSchema.safeParse(stimulus);
      expect(result.success).toBe(true);
    });

    it("should reject invalid mediaUrl format", () => {
      const stimulus = {
        contextText: "উদ্দীপক বিবরণ...",
        mediaUrl: "not-a-valid-url",
      };
      const result = CQValidation.cqStimulusSchema.safeParse(stimulus);
      expect(result.success).toBe(false);
    });
  });

  describe("createCQSchema & Total Marks Validation", () => {
    it("should accept valid CQ package with 1+2+3+4 = 10 marks", () => {
      const payload = {
        body: {
          stimulus: {
            title: "দৃশ্যকল্প ১: তড়িৎ বর্তনী",
            contextText: "একটি ১২ ভোল্টের ব্যাটারির সাথে ৬ ওহম, ৩ ওহম এবং ৪ ওহমের তিনটি রোধ যুক্ত আছে।",
            contextType: "STEM" as const,
            mediaUrl: "https://example.com/circuit.png",
            educationLevelId: VALID_UUID,
            subjectId: VALID_UUID,
            chapterId: VALID_UUID,
            topicId: VALID_UUID,
          },
          questions: validCQSubQuestions,
          totalMarks: 10.0,
          commonTagNames: ["Physics 2nd Paper", "Dhaka Board 2024"],
        },
      };

      const result = CQValidation.createCQSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.totalMarks).toBe(10.0);
        expect(result.data.body.questions).toHaveLength(4);
      }
    });

    it("should reject CQ package when sum of marks does not match totalMarks", () => {
      const invalidMarksQuestions = [
        { ...validCQSubQuestions[0], marks: 1.0 },
        { ...validCQSubQuestions[1], marks: 2.0 },
        { ...validCQSubQuestions[2], marks: 3.0 },
        { ...validCQSubQuestions[3], marks: 5.0 }, // Sum = 11, totalMarks = 10
      ];

      const payload = {
        body: {
          stimulus: {
            title: "দৃশ্যকল্প ১",
            contextText: "উদ্দীপকের বর্ণনা...",
          },
          questions: invalidMarksQuestions,
          totalMarks: 10.0,
        },
      };

      const result = CQValidation.createCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must equal the total CQ marks");
      }
    });

    it("should reject CQ package with empty stimulus text", () => {
      const payload = {
        body: {
          stimulus: {
            contextText: "   ",
          },
          questions: validCQSubQuestions,
          totalMarks: 10.0,
        },
      };

      const result = CQValidation.createCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject sub-question with invalid label", () => {
      const payload = {
        body: {
          stimulus: {
            contextText: "উদ্দীপক...",
          },
          questions: [
            { ...validCQSubQuestions[0], label: "ঙ" as any },
            validCQSubQuestions[1],
            validCQSubQuestions[2],
            validCQSubQuestions[3],
          ],
          totalMarks: 10.0,
        },
      };

      const result = CQValidation.createCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("updateCQSchema", () => {
    it("should accept partial stimulus update", () => {
      const payload = {
        body: {
          stimulus: {
            title: "পরিমার্জিত দৃশ্যকল্প ১",
            contextText: "পরিমার্জিত উদ্দীপক...",
          },
        },
      };

      const result = CQValidation.updateCQSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject update when sub-questions sum does not match updated totalMarks", () => {
      const payload = {
        body: {
          questions: [
            { label: "ক" as const, cognitiveLevel: "KNOWLEDGE" as const, questionText: "Q1", marks: 2 },
            { label: "খ" as const, cognitiveLevel: "COMPREHENSION" as const, questionText: "Q2", marks: 2 },
          ],
          totalMarks: 10,
        },
      };

      const result = CQValidation.updateCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
