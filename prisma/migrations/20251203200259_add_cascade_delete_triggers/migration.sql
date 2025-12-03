-- Trigger para deletar a Imagem quando o Dosie for deletado
CREATE TRIGGER delete_image_after_dosie_delete AFTER DELETE ON "Dosie" BEGIN
DELETE FROM "Image"
WHERE
  id = OLD.imageId;

END;

-- Trigger para deletar o Documento quando o Dosie for deletado
CREATE TRIGGER delete_document_after_dosie_delete AFTER DELETE ON "Dosie" BEGIN
DELETE FROM "Document"
WHERE
  id = OLD.documentId;

END;