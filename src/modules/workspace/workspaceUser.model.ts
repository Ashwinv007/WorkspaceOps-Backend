import { Schema, model } from "mongoose";

const workspaceUserSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
      required: true
    }
  },
  { timestamps: true }
);

export const WorkspaceUserModel = model(
  "WorkspaceUser",
  workspaceUserSchema
);
