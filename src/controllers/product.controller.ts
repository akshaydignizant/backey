
import { Request, Response } from 'express';
import { productService } from '../services/product.service';

export const createProduct = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  try {
    const product = await productService.createProduct(Number(workspaceId), req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

export const getProductsInWorkspace = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  try {
    const products = await productService.getProductsInWorkspace(Number(workspaceId));
    res.status(200).json(products);
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { workspaceId, productId } = req.params;
  try {
    const updatedProduct = await productService.updateProduct(Number(workspaceId), productId, req.body);
    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { workspaceId, productId } = req.params;
  try {
    await productService.deleteProduct(Number(workspaceId), productId);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err });
  }
};
