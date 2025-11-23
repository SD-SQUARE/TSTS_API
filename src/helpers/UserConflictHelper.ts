import { id } from "zod/locales";
import { userRepository } from "../repositories/UserRepository.js";

export const validateEmailAndSsnForAdd = async (
  email: string,
  ssn?: string
) => {
  const conflict = await userRepository.checkEmailOrSsnConflictForAdd(
    email,
    ssn
  );

  if (conflict.status === "email") {
    return "email_already_exists";
  }

  if (conflict.status === "ssn") {
    return "ssn_already_exists";
  }

  if (conflict.status === "both") {
    return "email_and_ssn_already_exist";
  }

  return null;
};

export const validateEmailAndSsnForEdit = async (
  id: string,
  email: string,
  ssn?: string
) => {
  const conflict = await userRepository.checkEmailOrSsnConflictForEdit(
    id,
    email,
    ssn
  );

  if (conflict.status === "email") {
    return "email_already_exists";
  }

  if (conflict.status === "ssn") {
    return "ssn_already_exists";
  }

  if (conflict.status === "both") {
    return "email_and_ssn_already_exist";
  }

  return null;
};
