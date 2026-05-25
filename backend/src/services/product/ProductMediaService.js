const { deleteImage } = require('../../config/cloudinary');

class ProductMediaService {
  async uploadImages(files) {
    if (!files?.length) return [];

    const cloudinary = require('cloudinary').v2;
    const images = [];

    for (const file of files) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'ecommerce/products', resource_type: 'auto' },
            (error, response) => (error ? reject(error) : resolve(response))
          );
          stream.end(file.buffer);
        });

        images.push({ url: result.secure_url, publicId: result.public_id });
      } catch (error) {
        await Promise.all(images.map((img) => deleteImage(img.publicId).catch(() => {})));
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }

    return images;
  }
}

module.exports = new ProductMediaService();
