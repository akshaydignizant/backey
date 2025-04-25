import cloudinary from '../config/cloudinaryConfig';

/**
 * Delete an image from Cloudinary given its public_id
 * @param publicId - The public ID of the image to delete
 */
export const deleteImageFromCloudinary = async (publicId: string) => {
  try {
    // Use the cloudinary instance you configured to delete the image
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'ok') {
      console.log('Image successfully deleted from Cloudinary');
    } else {
      throw new Error('Failed to delete image from Cloudinary');
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw new Error('Error deleting image from Cloudinary');
  }
};

/**
 * Extract the public_id from a Cloudinary URL
 * @param url - The Cloudinary image URL
 * @returns public_id - The Cloudinary public ID
 */
export const extractPublicIdFromCloudinaryUrl = (url: string): string => {
  // The public_id is the part before the file extension, and after the `/v<version>/` part of the URL
  const regex = /\/v\d+\/(.*?)(?:\.\w{3,4}$)/;
  const match = url.match(regex);
  if (!match || match.length < 2) {
    throw new Error('Invalid Cloudinary URL');
  }
  return match[1];
};
