using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ChangeCatalogStatusRequest(CatalogStatus? Status);
