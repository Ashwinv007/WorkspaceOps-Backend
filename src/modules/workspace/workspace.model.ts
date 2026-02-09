
import { Schema, model } from "mongoose";

const workspaceSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export const WorkspaceModel = model("Workspace", workspaceSchema);