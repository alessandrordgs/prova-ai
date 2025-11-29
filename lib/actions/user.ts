"use server";

import {cookies} from 'next/headers'
import { z} from 'zod'
import { prisma } from '../database/prisma';

const usernameSchema = z.string().min(3, "usename precisa ter no mínimo 3 caracteres").max(20, "username pode ter no máximo 20 caracteres").regex(/^[a-zA-Z0-9_]+$/, "username pode conter apenas letras, números e underline")

interface ActionResult {
  success: boolean;
  message?: string;
  userId?: string;
}
const DAYS_180_IN_SECONDS = 60 * 60 * 24 * 180;
export async function createUser(username: string): Promise<ActionResult> {

   const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0].message,
      };
    }

    try {
      const user = await prisma.user.create({
        data: {
          username: validation.data,
        },
      })

      const cookieStore = cookies();
      (await cookieStore).set('provaai-user-id', user.id, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: DAYS_180_IN_SECONDS
      })
      return {
        success: true,
        userId: user.id,
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Erro ao criar usuário",
      }
    }
}

export async function createGuestUser(): Promise<ActionResult> {
  try {
    const user = await prisma.user.create({
      data: {
        username: null,
      },
    })  
    const cookieStore = cookies();
    (await cookieStore).set('provaai-user-id', user.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: DAYS_180_IN_SECONDS
    })
    return {
      success: true,
      userId: user.id,
    }
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Erro ao criar usuário",
    }
  }
}


export async function getCurrentUser() {
  const cookieStore = cookies();
  const userId = (await cookieStore).get('provaai-user-id')?.value;
  
  if (!userId) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  return user;  
}