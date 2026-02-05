export type Role = "youth" | "leader" | "admin";

export type Profile = {
  id: string;
  name: string;
  role: Role;
  group_id: string | null;
};
