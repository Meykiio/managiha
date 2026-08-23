update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'product-images';
