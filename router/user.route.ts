import { Router } from 'express'
import { createUser, deleteUser, getUser, getUsers, updateUser } from '../controller/user.controller';

const router = Router()

router.post('/', createUser)
router.get('/', getUsers)
router.get('/:id', getUser)
router.put('/:id',updateUser)
router.delete('/:id',deleteUser)

export default router
