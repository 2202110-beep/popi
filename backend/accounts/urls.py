from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    CollaboratorRegisterView,
    AdminOverviewView,
    CollaboratorDecisionView,
    CsrfTokenView,
    PublicPlacesView,
    CollaboratorApplyView,
    PartnerApplicationsView,
    PartnerCreateBathroomView,
    DebugSessionView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('debug/session/', DebugSessionView.as_view(), name='debug-session'),
    path('collaborator/register/', CollaboratorRegisterView.as_view(), name='collaborator-register'),
    path('admin/overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('admin/collaborators/<int:pk>/decision/', CollaboratorDecisionView.as_view(), name='admin-collaborator-decision'),
    path('csrf/', CsrfTokenView.as_view(), name='csrf-token'),
    path('places/public/', PublicPlacesView.as_view(), name='public-places'),
    path('collaborator/apply/', CollaboratorApplyView.as_view(), name='collaborator-apply'),
    path('partner/applications/', PartnerApplicationsView.as_view(), name='partner-applications'),
    path('partner/applications/<int:application_id>/bathroom/', PartnerCreateBathroomView.as_view(), name='partner-create-bathroom'),
]

