import type { ErpStateData } from "@/lib/erp/types";

const now = new Date();
const toIso = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

export const erpSeedData: ErpStateData = {
  organizations: [
    { id: "org-1", name: "Northwind" },
    { id: "org-2", name: "Innotech" }
  ],
  users: [
    { id: "u-1", organizationId: "org-1", name: "Анна Sales", role: "sales" },
    { id: "u-2", organizationId: "org-1", name: "Игорь Manager", role: "manager" },
    { id: "u-3", organizationId: "org-1", name: "Ольга Admin", role: "admin" },
    { id: "u-4", organizationId: "org-2", name: "Павел User", role: "user" }
  ],
  clients: [
    {
      id: "c-1",
      organizationId: "org-1",
      name: "ООО Альфа",
      email: "contact@alpha.ru",
      type: "company",
      responsibleUserId: "u-1",
      status: "new",
      comments: [],
      files: []
    },
    {
      id: "c-2",
      organizationId: "org-1",
      name: "Иван Петров",
      email: "ivan.petrov@example.com",
      type: "individual",
      responsibleUserId: "u-2",
      status: "in_progress",
      comments: [],
      files: []
    }
  ],
  deals: [
    {
      id: "d-1",
      organizationId: "org-1",
      title: "Сделка по внедрению ERP",
      clientId: "c-1",
      amount: 12000,
      currency: "USD",
      responsibleUserId: "u-1",
      status: "new",
      comments: [],
      files: []
    }
  ],
  tasks: [
    {
      id: "t-1",
      organizationId: "org-1",
      title: "Подготовить коммерческое предложение",
      entityType: "deal",
      entityId: "d-1",
      assignedUserId: "u-1",
      dueDate: toIso(-1),
      status: "in_progress",
      comments: [],
      files: []
    },
    {
      id: "t-2",
      organizationId: "org-1",
      title: "Согласовать бюджет",
      entityType: "project",
      entityId: "p-1",
      assignedUserId: "u-2",
      dueDate: toIso(2),
      status: "new",
      comments: [],
      files: []
    }
  ],
  projects: [
    {
      id: "p-1",
      organizationId: "org-1",
      name: "Запуск нового направления",
      ownerUserId: "u-2",
      status: "new",
      comments: [],
      files: []
    }
  ],
  notifications: [],
  savedFilters: []
};
