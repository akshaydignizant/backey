import { Request, Response, NextFunction } from 'express'
import {
  getAllUsers as getAllUsersService,
  createUser as createUserService,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService
} from '../service/user.service'

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUserService(req.body)
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

export const getUsers = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getAllUsersService()
    res.json(users)
  } catch (err) {
    next(err)
  }
}

export const getUser = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
  try {
    const user = await getUserByIdService(req.params.id)
    if (!user) 
       res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await updateUserService(req.params.id, req.body)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteUserService(req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
